"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import {
  ORIGENS_SERVICO_JURIDICO,
  STATUS_SERVICO_JURIDICO,
  type OrigemServicoJuridico,
  type StatusServicoJuridico,
} from "@/lib/servicos-juridicos";
import { registrarContratacaoServicoJuridico } from "@/lib/servicos-juridicos-server";

export type ServicoJuridicoState = { error?: string; message?: string };

function origemValida(valor: string): valor is OrigemServicoJuridico {
  return ORIGENS_SERVICO_JURIDICO.includes(valor as OrigemServicoJuridico);
}

function statusValido(valor: string): valor is StatusServicoJuridico {
  return STATUS_SERVICO_JURIDICO.includes(valor as StatusServicoJuridico);
}

function revalidarServico(params: {
  imovelId?: string | null;
  negocioId?: string | null;
}) {
  if (params.imovelId) {
    revalidatePath("/painel/imoveis");
    revalidatePath(`/painel/imoveis/${params.imovelId}`);
  }
  if (params.negocioId) {
    revalidatePath(`/painel/negocios/${params.negocioId}`);
    revalidatePath(`/painel/negocios/${params.negocioId}/documentos`);
    revalidatePath(`/painel/negocios/${params.negocioId}/contrato`);
    revalidatePath("/painel/negocios");
    revalidatePath("/painel/notificacoes");
  }
  revalidatePath("/painel/observabilidade");
}

export async function contratarServicoJuridico(
  _prev: ServicoJuridicoState,
  formData: FormData,
): Promise<ServicoJuridicoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const pacote = String(formData.get("pacote") ?? "");
  const tipoNegocio = String(formData.get("tipo_negocio") ?? "venda");
  const origemBruta = String(formData.get("origem") ?? "documentos");
  const origem = origemValida(origemBruta) ? origemBruta : "documentos";
  const imovelId = String(formData.get("imovel_id") ?? "").trim() || null;
  const negocioId = String(formData.get("negocio_id") ?? "").trim() || null;
  const observacoes =
    String(formData.get("observacoes") ?? "").trim() || null;

  const resultado = await registrarContratacaoServicoJuridico({
    sessao,
    pacote,
    tipoNegocio,
    origem,
    imovelId,
    negocioId,
    observacoes,
  });

  if (resultado.error) return { error: resultado.error };

  revalidarServico({
    imovelId: resultado.imovelId,
    negocioId: resultado.negocioId,
  });
  return { message: "Servico juridico contratado." };
}

export async function atualizarStatusServicoJuridico(
  _prev: ServicoJuridicoState,
  formData: FormData,
): Promise<ServicoJuridicoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const contratacaoId = String(formData.get("contratacao_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!contratacaoId) return { error: "Contratacao nao identificada." };
  if (!statusValido(status)) return { error: "Status invalido." };

  const supabase = await createClient();
  const { data: contratacao, error: buscaError } = await supabase
    .from("servicos_juridicos_contratacoes")
    .select("id, imovel_id, negocio_id, status")
    .eq("id", contratacaoId)
    .maybeSingle();

  if (buscaError || !contratacao)
    return { error: "Nao foi possivel carregar a contratacao." };

  let podeAtualizar = sessao.isAdmin;
  if (!podeAtualizar && contratacao.negocio_id) {
    const { data: papel } = await supabase
      .from("papeis_negocio")
      .select("id")
      .eq("negocio_id", contratacao.negocio_id)
      .eq("usuario_id", sessao.user.id)
      .in("papel", ["corretor", "admin"])
      .eq("ativo", true)
      .maybeSingle();
    podeAtualizar = Boolean(papel);
  }

  if (!podeAtualizar)
    return { error: "Voce nao tem permissao para atualizar este servico." };

  const { data, error } = await supabase
    .from("servicos_juridicos_contratacoes")
    .update({ status })
    .eq("id", contratacaoId)
    .select("id, imovel_id, negocio_id, status")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel atualizar o status do servico." };

  await registrarEvento("servico_juridico_status_mudado", {
    entidadeId: data.id,
    payload: {
      status,
      status_anterior: contratacao.status,
      imovel_id: data.imovel_id,
      negocio_id: data.negocio_id,
    },
  });

  revalidarServico({ imovelId: data.imovel_id, negocioId: data.negocio_id });
  return { message: "Status do servico atualizado." };
}
