"use server";

import { revalidatePath } from "next/cache";
import { getSessao, type Sessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type PrestadorCartorialState = { error?: string; message?: string };

const TIPOS_PRESTADOR = [
  "tabeliao",
  "despachante",
  "assinante_cartorial",
  "agente_cartorial",
  "juridico",
  "outro",
] as const;

const STATUS_PRESTADOR = [
  "pendente",
  "aprovado",
  "reprovado",
  "suspenso",
] as const;

const STATUS_VINCULO = ["ativo", "removido", "concluido"] as const;

type TipoPrestador = (typeof TIPOS_PRESTADOR)[number];
type StatusPrestador = (typeof STATUS_PRESTADOR)[number];
type StatusVinculo = (typeof STATUS_VINCULO)[number];

type PapelNegocio = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
};

type NegocioComPapeis = {
  id: string;
  papeis_negocio?: PapelNegocio[];
};

function texto(valor: FormDataEntryValue | null): string | null {
  const normalizado = String(valor ?? "").trim();
  return normalizado || null;
}

function listaCidades(valor: FormDataEntryValue | null): string[] {
  return String(valor ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function tipoValido(valor: string): valor is TipoPrestador {
  return TIPOS_PRESTADOR.includes(valor as TipoPrestador);
}

function statusPrestadorValido(valor: string): valor is StatusPrestador {
  return STATUS_PRESTADOR.includes(valor as StatusPrestador);
}

function statusVinculoValido(valor: string): valor is StatusVinculo {
  return STATUS_VINCULO.includes(valor as StatusVinculo);
}

function podeOperarNegocio(sessao: Sessao, negocio: NegocioComPapeis): boolean {
  if (sessao.isAdmin) return true;
  return Boolean(
    negocio.papeis_negocio?.some(
      (papel) =>
        papel.ativo &&
        papel.usuario_id === sessao.user.id &&
        ["corretor", "admin"].includes(papel.papel),
    ),
  );
}

async function carregarNegocioPorFluxo(
  fluxoId: string,
): Promise<{ negocio: NegocioComPapeis | null; negocioId: string | null }> {
  const supabase = await createClient();
  const { data: fluxo } = await supabase
    .from("negocio_cartorial_fluxos")
    .select("id, negocio_id")
    .eq("id", fluxoId)
    .maybeSingle();

  if (!fluxo?.negocio_id) return { negocio: null, negocioId: null };

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id, papeis_negocio(papel, ativo, usuario_id)")
    .eq("id", fluxo.negocio_id)
    .maybeSingle();

  return {
    negocio: (negocio as unknown as NegocioComPapeis | null) ?? null,
    negocioId: fluxo.negocio_id,
  };
}

export async function salvarCadastroPrestadorCartorial(
  _prev: PrestadorCartorialState,
  formData: FormData,
): Promise<PrestadorCartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const tipo = String(formData.get("tipo") ?? "despachante");
  const nomeExibicao = String(formData.get("nome_exibicao") ?? "").trim();
  if (!tipoValido(tipo)) return { error: "Tipo de prestador invalido." };
  if (nomeExibicao.length < 3)
    return { error: "Informe o nome de exibicao do prestador." };

  const payload = {
    usuario_id: sessao.user.id,
    tipo,
    nome_exibicao: nomeExibicao,
    documento: texto(formData.get("documento")),
    registro_profissional: texto(formData.get("registro_profissional")),
    empresa: texto(formData.get("empresa")),
    telefone: texto(formData.get("telefone")),
    email: texto(formData.get("email")) ?? sessao.user.email,
    cidades_atuacao: listaCidades(formData.get("cidades_atuacao")),
    documentos_qualificacao: texto(formData.get("documentos_qualificacao")),
    status: "pendente",
    observacoes_admin: null,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prestadores_cartoriais")
    .upsert(payload, { onConflict: "usuario_id" })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel salvar o cadastro de prestador." };

  await registrarEvento("prestador_cartorial_cadastrado", {
    entidadeId: data.id,
    payload: { tipo, status: "pendente" },
  });

  revalidatePath("/painel/prestadores-cartoriais");
  return { message: "Cadastro enviado para revisao." };
}

export async function atualizarStatusPrestadorCartorial(
  _prev: PrestadorCartorialState,
  formData: FormData,
): Promise<PrestadorCartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };
  if (!sessao.isAdmin)
    return { error: "Apenas admin pode aprovar prestadores." };

  const prestadorId = String(formData.get("prestador_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  if (!prestadorId) return { error: "Prestador nao identificado." };
  if (!statusPrestadorValido(status)) return { error: "Status invalido." };
  if (!tipoValido(tipo)) return { error: "Tipo de servico invalido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prestadores_cartoriais")
    .update({
      status,
      tipo,
      observacoes_admin: texto(formData.get("observacoes_admin")),
      aprovado_por: status === "aprovado" ? sessao.user.id : null,
    })
    .eq("id", prestadorId)
    .select("id, usuario_id")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel atualizar o prestador." };

  await registrarEvento("prestador_cartorial_status_mudado", {
    entidadeId: prestadorId,
    payload: { status, tipo, usuario_id: data.usuario_id },
  });

  revalidatePath("/painel/prestadores-cartoriais");
  return { message: "Prestador atualizado." };
}

export async function vincularPrestadorCartorial(
  _prev: PrestadorCartorialState,
  formData: FormData,
): Promise<PrestadorCartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const fluxoId = String(formData.get("fluxo_id") ?? "");
  const prestadorId = String(formData.get("prestador_id") ?? "");
  const papelOperacional = String(formData.get("papel_operacional") ?? "");
  if (!fluxoId) return { error: "Fluxo cartorial nao identificado." };
  if (!prestadorId) return { error: "Selecione um prestador aprovado." };
  if (!tipoValido(papelOperacional))
    return { error: "Tipo de atuacao invalido." };

  const { negocio, negocioId } = await carregarNegocioPorFluxo(fluxoId);
  if (!negocio || !negocioId)
    return { error: "Nao foi possivel carregar o negocio." };
  if (!podeOperarNegocio(sessao, negocio))
    return { error: "Voce nao tem permissao para vincular prestadores." };

  const supabase = await createClient();
  const { data: prestador } = await supabase
    .from("prestadores_cartoriais")
    .select("id, status")
    .eq("id", prestadorId)
    .maybeSingle();

  if (prestador?.status !== "aprovado")
    return { error: "O prestador precisa estar aprovado." };

  const { data, error } = await supabase
    .from("negocio_cartorial_prestadores")
    .insert({
      fluxo_id: fluxoId,
      negocio_id: negocioId,
      prestador_id: prestadorId,
      papel_operacional: papelOperacional,
      observacoes: texto(formData.get("observacoes")),
      status: "ativo",
      atribuido_por: sessao.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel vincular o prestador." };

  await registrarEvento("prestador_cartorial_vinculado", {
    entidadeId: negocioId,
    payload: {
      fluxo_id: fluxoId,
      prestador_id: prestadorId,
      vinculo_id: data.id,
      papel_operacional: papelOperacional,
    },
  });

  revalidatePath(`/painel/negocios/${negocioId}/cartorial`);
  revalidatePath("/painel/prestadores-cartoriais");
  revalidatePath("/painel/observabilidade");
  return { message: "Prestador vinculado ao cartorial." };
}

export async function atualizarVinculoPrestadorCartorial(
  _prev: PrestadorCartorialState,
  formData: FormData,
): Promise<PrestadorCartorialState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const vinculoId = String(formData.get("vinculo_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!vinculoId) return { error: "Vinculo nao identificado." };
  if (!statusVinculoValido(status)) return { error: "Status invalido." };

  const supabase = await createClient();
  const { data: vinculo } = await supabase
    .from("negocio_cartorial_prestadores")
    .select("id, fluxo_id, negocio_id, prestador_id")
    .eq("id", vinculoId)
    .maybeSingle();

  if (!vinculo) return { error: "Nao foi possivel carregar o vinculo." };

  const { data: negocio } = await supabase
    .from("negocios")
    .select("id, papeis_negocio(papel, ativo, usuario_id)")
    .eq("id", vinculo.negocio_id)
    .maybeSingle();

  if (!negocio || !podeOperarNegocio(sessao, negocio as unknown as NegocioComPapeis))
    return { error: "Voce nao tem permissao para atualizar o vinculo." };

  const { error } = await supabase
    .from("negocio_cartorial_prestadores")
    .update({
      status,
      removido_por: status === "removido" ? sessao.user.id : null,
      observacoes: texto(formData.get("observacoes")),
    })
    .eq("id", vinculo.id);

  if (error) return { error: "Nao foi possivel atualizar o vinculo." };

  await registrarEvento(
    status === "removido"
      ? "prestador_cartorial_removido"
      : "prestador_cartorial_vinculado",
    {
      entidadeId: vinculo.negocio_id,
      payload: {
        fluxo_id: vinculo.fluxo_id,
        prestador_id: vinculo.prestador_id,
        vinculo_id: vinculo.id,
        status,
      },
    },
  );

  revalidatePath(`/painel/negocios/${vinculo.negocio_id}/cartorial`);
  revalidatePath("/painel/prestadores-cartoriais");
  revalidatePath("/painel/observabilidade");
  return { message: "Vinculo atualizado." };
}
