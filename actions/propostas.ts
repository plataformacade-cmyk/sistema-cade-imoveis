"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import {
  AVISO_CONTATO_EXTERNO,
  detectarContatoExterno,
} from "@/lib/chat/contato";
import { registrarTentativaContato } from "@/lib/chat/tentativas-contato";
import {
  mensagemTermosPendentes,
  perfisTermosDosPapeisNegocio,
  usuarioTemTermosPendentes,
} from "@/lib/termos";
import { revalidatePath } from "next/cache";

export type PropostaState = { error?: string; message?: string };

type Sessao = NonNullable<Awaited<ReturnType<typeof getSessao>>>;

type ContextoNegocio = {
  negocioId: string;
  negocioStatus: string;
  papeisUsuario: string[];
};

type PropostaLinha = {
  id: string;
  negocio_id: string;
  autor_id: string;
  valor: number;
  condicoes: string | null;
  status: string;
};

type TipoMensagemProposta =
  | "proposta_enviada"
  | "contraproposta_enviada"
  | "proposta_aceita"
  | "proposta_recusada";

const STATUS_NEGOCIO_ENCERRADO = ["concluido", "perdido"];
const STATUS_PROMOVE_PROPOSTA = ["qualificacao", "visita"];
const STATUS_PROMOVE_DOCUMENTOS = ["qualificacao", "visita", "proposta"];

/** Converte o valor bruto do form em numero (>= 0) ou null se invalido. */
function parseValor(bruto: string): number | null {
  const n = Number(bruto.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

async function carregarContextoNegocio(
  negocioId: string,
  sessao: Sessao,
): Promise<ContextoNegocio | null> {
  const supabase = await createClient();

  const [{ data: negocio, error: negocioErro }, { data: papeis }] =
    await Promise.all([
      supabase
        .from("negocios")
        .select("id, status")
        .eq("id", negocioId)
        .maybeSingle(),
      supabase
        .from("papeis_negocio")
        .select("papel")
        .eq("negocio_id", negocioId)
        .eq("usuario_id", sessao.user.id)
        .eq("ativo", true),
    ]);

  if (negocioErro || !negocio) return null;

  const papeisUsuario = (papeis ?? []).map((papel) => String(papel.papel));
  if (!sessao.isAdmin && papeisUsuario.length === 0) return null;

  return {
    negocioId: String(negocio.id),
    negocioStatus: String(negocio.status),
    papeisUsuario,
  };
}

function negocioAbertoParaProposta(contexto: ContextoNegocio) {
  return !STATUS_NEGOCIO_ENCERRADO.includes(contexto.negocioStatus);
}

async function atualizarStatusNegocio(params: {
  negocioId: string;
  statusAtual: string;
  statusDestino: "proposta" | "documentos";
  statusPermitidos: string[];
  motivo: string;
  propostaId: string;
}) {
  if (!params.statusPermitidos.includes(params.statusAtual)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("negocios")
    .update({ status: params.statusDestino })
    .eq("id", params.negocioId)
    .in("status", params.statusPermitidos);

  if (error) return;

  await registrarEvento("negocio_status_mudado", {
    entidadeId: params.negocioId,
    payload: {
      status: params.statusDestino,
      status_anterior: params.statusAtual,
      motivo: params.motivo,
      proposta_id: params.propostaId,
    },
  });
}

async function inserirMensagemProposta(params: {
  conversaId: string;
  autorId: string;
  tipo: TipoMensagemProposta;
  corpo: string;
  proposta: PropostaLinha;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("mensagens").insert({
    conversa_id: params.conversaId,
    autor_id: params.autorId,
    corpo: params.corpo,
    tipo: params.tipo,
    metadata: {
      proposta_id: params.proposta.id,
      negocio_id: params.proposta.negocio_id,
      autor_id: params.proposta.autor_id,
      valor: params.proposta.valor,
      condicoes: params.proposta.condicoes,
      status: params.proposta.status,
    },
  });

  return !error;
}

async function garantirConversaNegocio(negocioId: string) {
  const supabase = await createClient();

  const { data: existente, error: buscaErro } = await supabase
    .from("conversas")
    .select("id")
    .eq("negocio_id", negocioId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (buscaErro) return null;
  if (existente) return existente.id as string;

  const { data: criada, error: criaErro } = await supabase
    .from("conversas")
    .insert({ negocio_id: negocioId })
    .select("id")
    .single();

  if (criaErro || !criada) return null;
  return criada.id as string;
}

async function buscarConversaNegocio(negocioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversas")
    .select("id")
    .eq("negocio_id", negocioId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}

function revalidarFluxoProposta(conversaId: string | null, negocioId: string) {
  if (conversaId) revalidatePath(`/painel/mensagens/${conversaId}`);
  revalidatePath("/painel/mensagens");
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/negocios");
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel", "layout");
}

async function criarProposta(
  formData: FormData,
  status: "enviada" | "contraproposta",
): Promise<PropostaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "");
  const valorBruto = String(formData.get("valor") ?? "").trim();
  const condicoes = String(formData.get("condicoes") ?? "").trim();

  if (!negocioId) return { error: "Negocio nao identificado." };
  if (valorBruto === "")
    return {
      error:
        status === "contraproposta"
          ? "Informe o valor da contraproposta."
          : "Informe o valor da proposta.",
    };

  const valor = parseValor(valorBruto);
  if (valor === null)
    return {
      error:
        status === "contraproposta"
          ? "Valor da contraproposta invalido."
          : "Valor da proposta invalido.",
    };

  const contexto = await carregarContextoNegocio(negocioId, sessao);
  if (!contexto) return { error: "Negocio nao encontrado." };
  if (!negocioAbertoParaProposta(contexto))
    return { error: "Nao e possivel propor em negocio encerrado." };

  const perfisTermos = perfisTermosDosPapeisNegocio(
    contexto.papeisUsuario,
    sessao.isAdmin,
  );
  if (await usuarioTemTermosPendentes(sessao.user.id, perfisTermos)) {
    return {
      error: mensagemTermosPendentes(
        perfisTermos,
        `/painel/negocios/${negocioId}`,
        "proposta",
      ),
    };
  }

  if (condicoes) {
    const contato = detectarContatoExterno(condicoes);
    if (contato.bloqueado) {
      const conversaId = await buscarConversaNegocio(negocioId);
      await registrarTentativaContato({
        conversaId,
        negocioId,
        usuarioId: sessao.user.id,
        entidadeTipo: "proposta",
        motivos: contato.motivos,
        textoMascarado: contato.textoMascarado,
      });

      revalidarFluxoProposta(conversaId, negocioId);
      revalidatePath("/painel/observabilidade");
      return { error: AVISO_CONTATO_EXTERNO };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propostas")
    .insert({
      negocio_id: negocioId,
      autor_id: sessao.user.id,
      valor,
      condicoes: condicoes || null,
      status,
    })
    .select("id, negocio_id, autor_id, valor, condicoes, status")
    .single();

  if (error || !data)
    return {
      error:
        status === "contraproposta"
          ? "Nao foi possivel enviar a contraproposta. Tente novamente."
          : "Nao foi possivel enviar a proposta. Tente novamente.",
    };

  const proposta = data as PropostaLinha;
  const conversaId = await garantirConversaNegocio(negocioId);
  if (!conversaId)
    return {
      error:
        "A proposta foi criada, mas nao foi possivel publicar no chat.",
    };

  const tipo =
    status === "contraproposta"
      ? "contraproposta_enviada"
      : "proposta_enviada";
  const mensagemCriada = await inserirMensagemProposta({
    conversaId,
    autorId: sessao.user.id,
    tipo,
    corpo:
      status === "contraproposta"
        ? "Contraproposta enviada."
        : "Proposta enviada.",
    proposta,
  });

  if (!mensagemCriada)
    return {
      error:
        "A proposta foi criada, mas nao foi possivel publicar no chat.",
    };

  await atualizarStatusNegocio({
    negocioId,
    statusAtual: contexto.negocioStatus,
    statusDestino: "proposta",
    statusPermitidos: STATUS_PROMOVE_PROPOSTA,
    motivo: status === "contraproposta" ? "contraproposta_enviada" : "proposta_enviada",
    propostaId: proposta.id,
  });

  await registrarEvento("proposta_enviada", {
    entidadeId: proposta.id,
    payload: {
      negocio_id: negocioId,
      conversa_id: conversaId,
      valor,
      condicoes: condicoes || null,
      contraproposta: status === "contraproposta",
    },
  });

  revalidarFluxoProposta(conversaId, negocioId);
  return {
    message:
      status === "contraproposta"
        ? "Contraproposta enviada."
        : "Proposta enviada.",
  };
}

/**
 * Envia uma nova proposta num negocio (status 'enviada').
 */
export async function enviarProposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  return criarProposta(formData, "enviada");
}

/**
 * Cria uma contraproposta num negocio (nova proposta, status 'contraproposta').
 */
export async function contraproposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  return criarProposta(formData, "contraproposta");
}

/**
 * Responde a uma proposta existente: aceita ou recusa.
 */
export async function responderProposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const propostaId = String(formData.get("proposta_id") ?? "");
  const acao = String(formData.get("acao") ?? "");

  if (!propostaId) return { error: "Proposta nao identificada." };
  if (acao !== "aceita" && acao !== "recusada")
    return { error: "Acao invalida." };

  const supabase = await createClient();
  const { data: propostaAtual, error: propostaErro } = await supabase
    .from("propostas")
    .select("id, negocio_id, autor_id, valor, condicoes, status")
    .eq("id", propostaId)
    .maybeSingle();

  if (propostaErro || !propostaAtual)
    return { error: "Proposta nao encontrada." };

  const proposta = propostaAtual as PropostaLinha;
  const contexto = await carregarContextoNegocio(proposta.negocio_id, sessao);
  if (!contexto) return { error: "Negocio nao encontrado." };
  if (!negocioAbertoParaProposta(contexto))
    return { error: "Nao e possivel responder proposta em negocio encerrado." };
  const perfisTermos = perfisTermosDosPapeisNegocio(
    contexto.papeisUsuario,
    sessao.isAdmin,
  );
  if (await usuarioTemTermosPendentes(sessao.user.id, perfisTermos)) {
    return {
      error: mensagemTermosPendentes(
        perfisTermos,
        `/painel/negocios/${proposta.negocio_id}`,
        "proposta",
      ),
    };
  }
  if (proposta.autor_id === sessao.user.id)
    return { error: "O autor da proposta nao pode responder a propria proposta." };
  if (!["enviada", "contraproposta"].includes(proposta.status))
    return { error: "Esta proposta nao esta aguardando resposta." };

  const { data, error } = await supabase
    .from("propostas")
    .update({ status: acao })
    .eq("id", propostaId)
    .select("id, negocio_id, autor_id, valor, condicoes, status")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel responder a proposta. Tente novamente." };

  const propostaAtualizada = data as PropostaLinha;
  const conversaId = await garantirConversaNegocio(propostaAtualizada.negocio_id);
  if (!conversaId)
    return {
      error:
        "A proposta foi respondida, mas nao foi possivel publicar no chat.",
    };

  const aceita = acao === "aceita";
  const mensagemCriada = await inserirMensagemProposta({
    conversaId,
    autorId: sessao.user.id,
    tipo: aceita ? "proposta_aceita" : "proposta_recusada",
    corpo: aceita ? "Proposta aceita." : "Proposta recusada.",
    proposta: propostaAtualizada,
  });

  if (!mensagemCriada)
    return {
      error:
        "A proposta foi respondida, mas nao foi possivel publicar no chat.",
    };

  if (aceita) {
    await atualizarStatusNegocio({
      negocioId: propostaAtualizada.negocio_id,
      statusAtual: contexto.negocioStatus,
      statusDestino: "documentos",
      statusPermitidos: STATUS_PROMOVE_DOCUMENTOS,
      motivo: "proposta_aceita",
      propostaId: propostaAtualizada.id,
    });
  }

  await registrarEvento("proposta_respondida", {
    entidadeId: propostaAtualizada.id,
    payload: {
      status: acao,
      negocio_id: propostaAtualizada.negocio_id,
      conversa_id: conversaId,
    },
  });

  revalidarFluxoProposta(conversaId, propostaAtualizada.negocio_id);
  return {
    message: aceita ? "Proposta aceita." : "Proposta recusada.",
  };
}
