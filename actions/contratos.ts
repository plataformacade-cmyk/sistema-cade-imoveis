"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao, type Sessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { LIMITE_ESCRITURA } from "@/lib/contrato";

export type ContratoState = { error?: string; message?: string };

type PapelNegocio = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
};

type NegocioContrato = {
  id: string;
  tipo: string | null;
  status: string;
  valor_acordado: number | null;
  escritura_publica: boolean;
  papeis_negocio?: PapelNegocio[];
};

type ContratoResumo = {
  id: string;
  negocio_id: string;
  tipo: string | null;
  status: string;
  versao: number;
};

const STATUS_ASSINAVEIS = ["gerado", "pendente_assinaturas"];
const STATUS_NAO_REGREDIR = [
  "cartorial",
  "concluido",
  "perdido",
  "acompanhamento_externo",
];
const PAPEIS_ASSINATURA = ["comprador", "proprietario"] as const;

function papeisAtivosDoUsuario(
  negocio: NegocioContrato,
  usuarioId: string,
): string[] {
  return (negocio.papeis_negocio ?? [])
    .filter((p) => p.ativo && p.usuario_id === usuarioId)
    .map((p) => p.papel);
}

function podeOperarContrato(sessao: Sessao, negocio: NegocioContrato): boolean {
  if (sessao.isAdmin) return true;
  return papeisAtivosDoUsuario(negocio, sessao.user.id).some((papel) =>
    ["proprietario", "corretor", "admin"].includes(papel),
  );
}

function podeRevisarContrato(sessao: Sessao, negocio: NegocioContrato): boolean {
  if (sessao.isAdmin) return true;
  return papeisAtivosDoUsuario(negocio, sessao.user.id).some((papel) =>
    ["corretor", "admin"].includes(papel),
  );
}

function papelAssinavelDoUsuario(
  negocio: NegocioContrato,
  usuarioId: string,
  papelInformado: string,
): "comprador" | "proprietario" | null {
  if (!(PAPEIS_ASSINATURA as readonly string[]).includes(papelInformado))
    return null;
  const temPapel = (negocio.papeis_negocio ?? []).some(
    (p) =>
      p.ativo && p.usuario_id === usuarioId && p.papel === papelInformado,
  );
  return temPapel ? (papelInformado as "comprador" | "proprietario") : null;
}

async function carregarNegocio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  negocioId: string,
): Promise<NegocioContrato | null> {
  const { data, error } = await supabase
    .from("negocios")
    .select(
      "id, tipo, status, valor_acordado, escritura_publica, papeis_negocio(papel, ativo, usuario_id)",
    )
    .eq("id", negocioId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as NegocioContrato;
}

async function carregarContrato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contratoId: string,
): Promise<ContratoResumo | null> {
  const { data, error } = await supabase
    .from("contratos")
    .select("id, negocio_id, tipo, status, versao")
    .eq("id", contratoId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ContratoResumo;
}

async function revalidarContrato(negocioId: string) {
  revalidatePath(`/painel/negocios/${negocioId}/contrato`);
  revalidatePath(`/painel/negocios/${negocioId}/documentos`);
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/observabilidade");
}

async function moverNegocioParaContratoSeAplicavel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  negocio: NegocioContrato,
  motivo: string,
) {
  if (STATUS_NAO_REGREDIR.includes(negocio.status)) return;
  if (negocio.status !== "documentos") return;

  const { error } = await supabase
    .from("negocios")
    .update({ status: "contrato" })
    .eq("id", negocio.id)
    .eq("status", "documentos");

  if (!error) {
    await registrarEvento("negocio_status_mudado", {
      entidadeId: negocio.id,
      payload: {
        status_anterior: negocio.status,
        status_novo: "contrato",
        motivo,
      },
    });
  }
}

async function dadosAuditoriaAssinatura() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "";
  const userAgent = h.get("user-agent")?.slice(0, 500) || null;
  const ipHash = ip
    ? createHash("sha256").update(ip).digest("hex")
    : null;
  return { ipHash, userAgent };
}

export async function gerarContrato(
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "");
  if (!negocioId) return { error: "Negocio nao identificado." };

  const supabase = await createClient();
  const negocio = await carregarNegocio(supabase, negocioId);
  if (!negocio) return { error: "Nao foi possivel carregar o negocio." };
  if (!podeOperarContrato(sessao, negocio))
    return { error: "Voce nao tem permissao para gerar este contrato." };

  const exigeEscritura =
    negocio.tipo === "venda" &&
    negocio.valor_acordado != null &&
    negocio.valor_acordado > LIMITE_ESCRITURA;

  if (exigeEscritura && !negocio.escritura_publica) {
    const { error } = await supabase
      .from("negocios")
      .update({ escritura_publica: true })
      .eq("id", negocioId);
    if (error)
      return { error: "Nao foi possivel atualizar a regra de escritura." };
  }

  const { data: ultimaVersao } = await supabase
    .from("contratos")
    .select("versao")
    .eq("negocio_id", negocioId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const versao =
    Number((ultimaVersao as { versao?: number } | null)?.versao ?? 0) + 1;

  const termoResumo =
    "Contrato gerado pela plataforma Cade Imoveis. Assinatura v1 interna: aceite auditavel por usuario, papel, data, IP hash e user-agent.";

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert({
      negocio_id: negocioId,
      tipo: negocio.tipo,
      status: "pendente_assinaturas",
      gerado_em: new Date().toISOString(),
      gerado_por: sessao.user.id,
      versao,
      termo_resumo: termoResumo,
    })
    .select("id, versao")
    .single();

  if (error || !contrato)
    return { error: "Nao foi possivel gerar o contrato. Tente novamente." };

  await moverNegocioParaContratoSeAplicavel(
    supabase,
    negocio,
    "contrato_gerado",
  );

  await registrarEvento("contrato_gerado", {
    entidadeId: negocioId,
    payload: {
      contrato_id: contrato.id,
      versao: contrato.versao,
      tipo: negocio.tipo,
      escritura_publica: exigeEscritura || negocio.escritura_publica,
    },
  });

  await revalidarContrato(negocioId);
  return { message: `Contrato v${contrato.versao} gerado.` };
}

export async function assinarContrato(
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const contratoId = String(formData.get("contrato_id") ?? "");
  const papel = String(formData.get("papel") ?? "");
  if (!contratoId) return { error: "Contrato nao identificado." };

  const supabase = await createClient();
  const contrato = await carregarContrato(supabase, contratoId);
  if (!contrato) return { error: "Nao foi possivel carregar o contrato." };
  if (!STATUS_ASSINAVEIS.includes(contrato.status))
    return { error: "Este contrato nao esta aberto para assinatura." };

  const negocio = await carregarNegocio(supabase, contrato.negocio_id);
  if (!negocio) return { error: "Nao foi possivel carregar o negocio." };

  const papelValidado = papelAssinavelDoUsuario(
    negocio,
    sessao.user.id,
    papel,
  );
  if (!papelValidado)
    return { error: "Voce nao tem o papel necessario para assinar." };

  const { ipHash, userAgent } = await dadosAuditoriaAssinatura();
  const termoResumo =
    "Declaro que li e aceito a versao vigente do contrato deste negocio.";

  const { error } = await supabase.from("contrato_assinaturas").insert({
    contrato_id: contrato.id,
    negocio_id: contrato.negocio_id,
    usuario_id: sessao.user.id,
    papel: papelValidado,
    versao: contrato.versao,
    termo_resumo: termoResumo,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Voce ja registrou esta assinatura." };
    return { error: "Nao foi possivel assinar o contrato." };
  }

  await registrarEvento("contrato_assinado", {
    entidadeId: contrato.negocio_id,
    payload: {
      contrato_id: contrato.id,
      versao: contrato.versao,
      papel: papelValidado,
    },
  });

  const { data: assinaturas } = await supabase
    .from("contrato_assinaturas")
    .select("papel")
    .eq("contrato_id", contrato.id);
  const papeisAssinados = new Set(
    ((assinaturas ?? []) as Array<{ papel: string }>).map((a) => a.papel),
  );
  const contratoCompleto = PAPEIS_ASSINATURA.every((p) =>
    papeisAssinados.has(p),
  );

  if (contratoCompleto) {
    const { error: updateError } = await supabase
      .from("contratos")
      .update({
        status: "assinado",
        assinado_em: new Date().toISOString(),
        motivo_reprovacao: null,
      })
      .eq("id", contrato.id)
      .in("status", STATUS_ASSINAVEIS);

    if (!updateError) {
      await registrarEvento("contrato_status_mudado", {
        entidadeId: contrato.negocio_id,
        payload: {
          contrato_id: contrato.id,
          versao: contrato.versao,
          status_anterior: contrato.status,
          status_novo: "assinado",
          motivo: "assinaturas_obrigatorias_concluidas",
        },
      });
    }
  }

  await revalidarContrato(contrato.negocio_id);
  return {
    message: contratoCompleto
      ? "Contrato assinado por todas as partes."
      : "Assinatura registrada.",
  };
}

export async function anexarArquivoContrato(
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const contratoId = String(formData.get("contrato_id") ?? "");
  const arquivoUrl = String(formData.get("arquivo_url") ?? "").trim();
  const arquivoNome = String(formData.get("arquivo_nome") ?? "").trim();
  if (!contratoId) return { error: "Contrato nao identificado." };
  if (!arquivoUrl) return { error: "Envie o arquivo antes de salvar." };

  const supabase = await createClient();
  const contrato = await carregarContrato(supabase, contratoId);
  if (!contrato) return { error: "Nao foi possivel carregar o contrato." };

  const negocio = await carregarNegocio(supabase, contrato.negocio_id);
  if (!negocio || !podeOperarContrato(sessao, negocio))
    return { error: "Voce nao tem permissao para anexar este contrato." };

  const { error } = await supabase
    .from("contratos")
    .update({
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome || null,
    })
    .eq("id", contrato.id);

  if (error)
    return { error: "Nao foi possivel registrar o arquivo do contrato." };

  await registrarEvento("contrato_status_mudado", {
    entidadeId: contrato.negocio_id,
    payload: {
      contrato_id: contrato.id,
      versao: contrato.versao,
      evento: "contrato_arquivo_anexado",
      arquivo_nome: arquivoNome || null,
    },
  });

  await revalidarContrato(contrato.negocio_id);
  return { message: "Arquivo do contrato anexado." };
}

export async function revisarContrato(
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const contratoId = String(formData.get("contrato_id") ?? "");
  const acao = String(formData.get("acao") ?? "");
  const motivo = String(formData.get("motivo_reprovacao") ?? "").trim();
  if (!contratoId) return { error: "Contrato nao identificado." };
  if (!["validado", "reprovado"].includes(acao))
    return { error: "Acao invalida." };
  if (acao === "reprovado" && !motivo)
    return { error: "Informe o motivo da reprovacao." };

  const supabase = await createClient();
  const contrato = await carregarContrato(supabase, contratoId);
  if (!contrato) return { error: "Nao foi possivel carregar o contrato." };

  const negocio = await carregarNegocio(supabase, contrato.negocio_id);
  if (!negocio || !podeRevisarContrato(sessao, negocio))
    return { error: "Voce nao tem permissao para revisar este contrato." };

  const { error } = await supabase
    .from("contratos")
    .update({
      status: acao,
      revisado_por: sessao.user.id,
      revisado_em: new Date().toISOString(),
      motivo_reprovacao: acao === "reprovado" ? motivo : null,
    })
    .eq("id", contrato.id);

  if (error)
    return { error: "Nao foi possivel revisar o contrato. Tente novamente." };

  await registrarEvento(
    acao === "validado" ? "contrato_validado" : "contrato_reprovado",
    {
      entidadeId: contrato.negocio_id,
      payload: {
        contrato_id: contrato.id,
        versao: contrato.versao,
        status_anterior: contrato.status,
        status_novo: acao,
        motivo_reprovacao: acao === "reprovado" ? motivo : undefined,
      },
    },
  );

  await registrarEvento("contrato_status_mudado", {
    entidadeId: contrato.negocio_id,
    payload: {
      contrato_id: contrato.id,
      versao: contrato.versao,
      status_anterior: contrato.status,
      status_novo: acao,
    },
  });

  await revalidarContrato(contrato.negocio_id);
  return {
    message:
      acao === "validado" ? "Contrato validado." : "Contrato reprovado.",
  };
}

// Compatibilidade com o form antigo. A assinatura formal agora usa papel.
export async function marcarAssinado(
  prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  return assinarContrato(prev, formData);
}
