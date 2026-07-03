"use server";

import { revalidatePath } from "next/cache";
import { getSessao, type Sessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type CartorialState = { error?: string; message?: string };

const STATUS_CARTORIAL = [
  "pendente",
  "documentos_cartorio",
  "minuta",
  "itbi_custas",
  "pendencias",
  "agendado",
  "escritura",
  "registro",
  "matricula_atualizada",
  "cancelado",
] as const;

const STATUS_PENDENCIA = [
  "aberta",
  "em_andamento",
  "resolvida",
  "cancelada",
] as const;

type PapelNegocio = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
};

type NegocioCartorial = {
  id: string;
  imovel_id: string | null;
  tipo: string | null;
  status: string;
  papeis_negocio?: PapelNegocio[];
};

type FluxoCartorial = {
  id: string;
  negocio_id: string;
  status: string;
};

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function revalidarCartorial(negocioId: string) {
  revalidatePath(`/painel/negocios/${negocioId}/cartorial`);
  revalidatePath(`/painel/negocios/${negocioId}/documentos`);
  revalidatePath(`/painel/negocios/${negocioId}/contrato`);
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/negocios");
  revalidatePath("/painel/observabilidade");
}

function numeroOpcional(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0 ? numero : NaN;
}

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function podeOperarCartorial(sessao: Sessao, negocio: NegocioCartorial): boolean {
  if (sessao.isAdmin) return true;
  return Boolean(
    negocio.papeis_negocio?.some(
      (p) =>
        p.ativo &&
        p.usuario_id === sessao.user.id &&
        ["corretor", "admin"].includes(p.papel),
    ),
  );
}

function usuarioParticipa(sessao: Sessao, negocio: NegocioCartorial): boolean {
  if (sessao.isAdmin) return true;
  return Boolean(
    negocio.papeis_negocio?.some(
      (p) => p.ativo && p.usuario_id === sessao.user.id,
    ),
  );
}

async function carregarNegocio(
  supabase: SupabaseServer,
  negocioId: string,
): Promise<NegocioCartorial | null> {
  const { data, error } = await supabase
    .from("negocios")
    .select("id, imovel_id, tipo, status, papeis_negocio(papel, ativo, usuario_id)")
    .eq("id", negocioId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as NegocioCartorial;
}

async function carregarFluxo(
  supabase: SupabaseServer,
  fluxoId: string,
): Promise<FluxoCartorial | null> {
  const { data, error } = await supabase
    .from("negocio_cartorial_fluxos")
    .select("id, negocio_id, status")
    .eq("id", fluxoId)
    .maybeSingle();

  if (error || !data) return null;
  return data as FluxoCartorial;
}

async function carregarServicoAtivo(
  supabase: SupabaseServer,
  negocio: NegocioCartorial,
) {
  const filtroStatus = ["contratado", "em_atendimento"];
  const { data: porNegocio } = await supabase
    .from("servicos_juridicos_contratacoes")
    .select("id")
    .eq("negocio_id", negocio.id)
    .in("status", filtroStatus)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (porNegocio?.id) return porNegocio;
  if (!negocio.imovel_id) return null;

  const { data: porImovel } = await supabase
    .from("servicos_juridicos_contratacoes")
    .select("id")
    .eq("imovel_id", negocio.imovel_id)
    .in("status", filtroStatus)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return porImovel ?? null;
}

async function contratoMaisRecenteValidado(
  supabase: SupabaseServer,
  negocioId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("contratos")
    .select("status")
    .eq("negocio_id", negocioId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.status === "validado";
}

export async function iniciarFluxoCartorial(
  _prev: CartorialState,
  formData: FormData,
): Promise<CartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "");
  if (!negocioId) return { error: "Negocio nao identificado." };

  const supabase = await createClient();
  const negocio = await carregarNegocio(supabase, negocioId);
  if (!negocio) return { error: "Nao foi possivel carregar o negocio." };
  if (!podeOperarCartorial(sessao, negocio))
    return { error: "Voce nao tem permissao para iniciar o cartorial." };
  if (negocio.tipo !== "venda")
    return { error: "Fluxo cartorial v1 se aplica apenas a venda." };
  if (!["contrato", "cartorial"].includes(negocio.status))
    return { error: "O cartorial so inicia depois da etapa de contrato." };
  if (negocio.status === "contrato") {
    const contratoValidado = await contratoMaisRecenteValidado(
      supabase,
      negocio.id,
    );
    if (!contratoValidado)
      return { error: "Valide o contrato mais recente antes do cartorial." };
  }

  const { data: existente } = await supabase
    .from("negocio_cartorial_fluxos")
    .select("id")
    .eq("negocio_id", negocio.id)
    .maybeSingle();

  if (existente?.id) {
    revalidarCartorial(negocio.id);
    return { message: "Fluxo cartorial ja existe para este negocio." };
  }

  const servico = await carregarServicoAtivo(supabase, negocio);
  const modo = servico?.id ? "servico_cade" : "externo";

  const { data: fluxo, error } = await supabase
    .from("negocio_cartorial_fluxos")
    .insert({
      negocio_id: negocio.id,
      servico_juridico_contratacao_id: servico?.id ?? null,
      modo,
      status: "documentos_cartorio",
      iniciado_por: sessao.user.id,
    })
    .select("id, status")
    .single();

  if (error || !fluxo)
    return { error: "Nao foi possivel iniciar o fluxo cartorial." };

  if (negocio.status !== "cartorial") {
    const { error: statusError } = await supabase
      .from("negocios")
      .update({ status: "cartorial" })
      .eq("id", negocio.id)
      .eq("status", "contrato");

    if (statusError)
      return { error: "Fluxo criado, mas o status do negocio nao foi atualizado." };

    await registrarEvento("negocio_status_mudado", {
      entidadeId: negocio.id,
      payload: {
        status_anterior: negocio.status,
        status_novo: "cartorial",
        motivo: "cartorial_fluxo_iniciado",
      },
    });
  }

  await registrarEvento("cartorial_fluxo_iniciado", {
    entidadeId: negocio.id,
    payload: { fluxo_id: fluxo.id, status: fluxo.status, modo },
  });

  revalidarCartorial(negocio.id);
  return { message: "Fluxo cartorial iniciado." };
}

export async function atualizarFluxoCartorial(
  _prev: CartorialState,
  formData: FormData,
): Promise<CartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const fluxoId = String(formData.get("fluxo_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!fluxoId) return { error: "Fluxo cartorial nao identificado." };
  if (!STATUS_CARTORIAL.includes(status as (typeof STATUS_CARTORIAL)[number]))
    return { error: "Status cartorial invalido." };

  const itbiValor = numeroOpcional(formData.get("itbi_valor"));
  const custasValor = numeroOpcional(formData.get("custas_valor"));
  if (Number.isNaN(itbiValor) || Number.isNaN(custasValor))
    return { error: "Informe valores validos para ITBI e custas." };

  const supabase = await createClient();
  const fluxo = await carregarFluxo(supabase, fluxoId);
  if (!fluxo) return { error: "Nao foi possivel carregar o fluxo cartorial." };

  const negocio = await carregarNegocio(supabase, fluxo.negocio_id);
  if (!negocio || !podeOperarCartorial(sessao, negocio))
    return { error: "Voce nao tem permissao para atualizar o cartorial." };

  const agendamentoRaw = String(formData.get("agendamento_em") ?? "").trim();
  const agendamentoEm = agendamentoRaw
    ? new Date(agendamentoRaw).toISOString()
    : null;
  if (agendamentoRaw && Number.isNaN(new Date(agendamentoRaw).getTime()))
    return { error: "Data de agendamento invalida." };

  const { error } = await supabase
    .from("negocio_cartorial_fluxos")
    .update({
      status,
      cartorio_nome: textoOpcional(formData.get("cartorio_nome")),
      cartorio_link: textoOpcional(formData.get("cartorio_link")),
      agendamento_em: agendamentoEm,
      agendamento_link: textoOpcional(formData.get("agendamento_link")),
      itbi_valor: itbiValor,
      custas_valor: custasValor,
      observacoes: textoOpcional(formData.get("observacoes")),
    })
    .eq("id", fluxo.id);

  if (error) return { error: "Nao foi possivel atualizar o cartorial." };

  await registrarEvento("cartorial_status_mudado", {
    entidadeId: negocio.id,
    payload: {
      fluxo_id: fluxo.id,
      status_anterior: fluxo.status,
      status_novo: status,
    },
  });

  revalidarCartorial(negocio.id);
  return { message: "Fluxo cartorial atualizado." };
}

export async function criarPendenciaCartorial(
  _prev: CartorialState,
  formData: FormData,
): Promise<CartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const fluxoId = String(formData.get("fluxo_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = textoOpcional(formData.get("descricao"));
  const responsavelPapel =
    String(formData.get("responsavel_papel") ?? "operacao").trim() ||
    "operacao";
  const prazo = textoOpcional(formData.get("prazo_em"));

  if (!fluxoId) return { error: "Fluxo cartorial nao identificado." };
  if (!titulo) return { error: "Informe o titulo da pendencia." };

  const supabase = await createClient();
  const fluxo = await carregarFluxo(supabase, fluxoId);
  if (!fluxo) return { error: "Nao foi possivel carregar o fluxo cartorial." };
  const negocio = await carregarNegocio(supabase, fluxo.negocio_id);
  if (!negocio || !podeOperarCartorial(sessao, negocio))
    return { error: "Voce nao tem permissao para criar pendencias." };

  const { data, error } = await supabase
    .from("negocio_cartorial_pendencias")
    .insert({
      fluxo_id: fluxo.id,
      negocio_id: negocio.id,
      titulo,
      descricao,
      responsavel_papel: responsavelPapel,
      prazo_em: prazo,
      status: "aberta",
      criado_por: sessao.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel criar a pendencia cartorial." };

  await registrarEvento("cartorial_pendencia_criada", {
    entidadeId: negocio.id,
    payload: { fluxo_id: fluxo.id, pendencia_id: data.id, responsavel_papel: responsavelPapel },
  });

  revalidarCartorial(negocio.id);
  return { message: "Pendencia cartorial criada." };
}

export async function atualizarPendenciaCartorial(
  _prev: CartorialState,
  formData: FormData,
): Promise<CartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const pendenciaId = String(formData.get("pendencia_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const observacao = textoOpcional(formData.get("observacao"));
  if (!pendenciaId) return { error: "Pendencia nao identificada." };
  if (!STATUS_PENDENCIA.includes(status as (typeof STATUS_PENDENCIA)[number]))
    return { error: "Status de pendencia invalido." };

  const supabase = await createClient();
  const { data: pendencia, error: pendenciaError } = await supabase
    .from("negocio_cartorial_pendencias")
    .select("id, fluxo_id, negocio_id, status")
    .eq("id", pendenciaId)
    .maybeSingle();

  if (pendenciaError || !pendencia)
    return { error: "Nao foi possivel carregar a pendencia." };
  const negocio = await carregarNegocio(supabase, pendencia.negocio_id);
  if (!negocio || !podeOperarCartorial(sessao, negocio))
    return { error: "Voce nao tem permissao para atualizar pendencias." };

  const { error } = await supabase
    .from("negocio_cartorial_pendencias")
    .update({
      status,
      observacao,
      resolvido_por:
        status === "resolvida" || status === "cancelada"
          ? sessao.user.id
          : null,
    })
    .eq("id", pendencia.id);

  if (error) return { error: "Nao foi possivel atualizar a pendencia." };

  await registrarEvento(
    status === "resolvida"
      ? "cartorial_pendencia_resolvida"
      : "cartorial_status_mudado",
    {
      entidadeId: negocio.id,
      payload: {
        fluxo_id: pendencia.fluxo_id,
        pendencia_id: pendencia.id,
        status_anterior: pendencia.status,
        status_novo: status,
      },
    },
  );

  revalidarCartorial(negocio.id);
  return { message: "Pendencia atualizada." };
}

export async function anexarArquivoPendenciaCartorial(
  _prev: CartorialState,
  formData: FormData,
): Promise<CartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const fluxoId = String(formData.get("fluxo_id") ?? "");
  const pendenciaId = String(formData.get("pendencia_id") ?? "").trim() || null;
  const arquivoUrl = String(formData.get("arquivo_url") ?? "").trim();
  const arquivoNome = String(formData.get("arquivo_nome") ?? "").trim() || null;
  const descricao = textoOpcional(formData.get("descricao"));
  if (!fluxoId) return { error: "Fluxo cartorial nao identificado." };
  if (!arquivoUrl) return { error: "Envie o arquivo antes de salvar." };

  const supabase = await createClient();
  const fluxo = await carregarFluxo(supabase, fluxoId);
  if (!fluxo) return { error: "Nao foi possivel carregar o fluxo cartorial." };
  const negocio = await carregarNegocio(supabase, fluxo.negocio_id);
  if (!negocio || !usuarioParticipa(sessao, negocio))
    return { error: "Voce nao tem permissao para anexar neste fluxo." };

  const { data, error } = await supabase
    .from("negocio_cartorial_anexos")
    .insert({
      fluxo_id: fluxo.id,
      pendencia_id: pendenciaId,
      negocio_id: negocio.id,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome,
      descricao,
      enviado_por: sessao.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel registrar o anexo cartorial." };

  await registrarEvento("cartorial_anexo_enviado", {
    entidadeId: negocio.id,
    payload: { fluxo_id: fluxo.id, pendencia_id: pendenciaId, anexo_id: data.id },
  });

  revalidarCartorial(negocio.id);
  return { message: "Anexo cartorial registrado." };
}

export async function concluirFluxoCartorial(
  _prev: CartorialState,
  formData: FormData,
): Promise<CartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const fluxoId = String(formData.get("fluxo_id") ?? "");
  const confirmacao = String(formData.get("confirmacao_operacional") ?? "").trim();
  if (!fluxoId) return { error: "Fluxo cartorial nao identificado." };

  const supabase = await createClient();
  const fluxo = await carregarFluxo(supabase, fluxoId);
  if (!fluxo) return { error: "Nao foi possivel carregar o fluxo cartorial." };
  const negocio = await carregarNegocio(supabase, fluxo.negocio_id);
  if (!negocio || !podeOperarCartorial(sessao, negocio))
    return { error: "Voce nao tem permissao para concluir o cartorial." };
  if (["perdido", "concluido", "acompanhamento_externo"].includes(negocio.status))
    return { error: "Este negocio nao pode ser reaberto pelo cartorial." };

  const { count: pendenciasAbertas } = await supabase
    .from("negocio_cartorial_pendencias")
    .select("id", { count: "exact", head: true })
    .eq("fluxo_id", fluxo.id)
    .in("status", ["aberta", "em_andamento"]);
  if ((pendenciasAbertas ?? 0) > 0)
    return { error: "Resolva ou cancele as pendencias abertas antes de concluir." };

  const { count: matriculasVerificadas } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", negocio.id)
    .eq("tipo_doc", "cartorio_matricula_atualizada_final")
    .eq("status", "verificado");
  if ((matriculasVerificadas ?? 0) === 0 && !confirmacao)
    return {
      error:
        "Anexe e verifique a matricula final ou registre uma confirmacao operacional.",
    };

  const agora = new Date().toISOString();
  const { error: fluxoError } = await supabase
    .from("negocio_cartorial_fluxos")
    .update({
      status: "concluido",
      confirmacao_operacional: confirmacao || null,
      concluido_por: sessao.user.id,
      concluido_em: agora,
    })
    .eq("id", fluxo.id);

  if (fluxoError) return { error: "Nao foi possivel concluir o cartorial." };

  const { error: negocioError } = await supabase
    .from("negocios")
    .update({ status: "concluido" })
    .eq("id", negocio.id)
    .eq("status", "cartorial");

  if (negocioError)
    return { error: "Cartorial concluido, mas o negocio nao foi atualizado." };

  await registrarEvento("cartorial_concluido", {
    entidadeId: negocio.id,
    payload: {
      fluxo_id: fluxo.id,
      matricula_final_verificada: (matriculasVerificadas ?? 0) > 0,
      confirmacao_operacional: Boolean(confirmacao),
    },
  });
  await registrarEvento("negocio_status_mudado", {
    entidadeId: negocio.id,
    payload: {
      status_anterior: negocio.status,
      status_novo: "concluido",
      motivo: "cartorial_concluido",
    },
  });

  revalidarCartorial(negocio.id);
  return { message: "Fluxo cartorial concluido e negocio finalizado." };
}
