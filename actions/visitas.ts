"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import {
  AVISO_CONTATO_EXTERNO,
  detectarContatoExterno,
} from "@/lib/chat/contato";
import { registrarTentativaContato } from "@/lib/chat/tentativas-contato";
import { revalidatePath } from "next/cache";

export type VisitaState = { error?: string; message?: string };

const STATUS_VALIDOS = [
  "solicitada",
  "aguardando_confirmacao",
  "confirmada",
  "realizada",
  "cancelada",
  "reagendada",
  "nao_compareceu",
];
const CANAIS_VALIDOS = ["presencial", "video"];
const PAPEIS_ANUNCIANTE = ["proprietario", "corretor", "admin"];

type ContextoConversa = {
  conversaId: string;
  negocioId: string;
  imovelId: string;
  negocioStatus: string;
  papeisUsuario: string[];
};

type VisitaChat = {
  id: string;
  negocio_id: string | null;
  imovel_id: string;
  data_hora: string;
  canal: string;
  observacoes: string | null;
  status: string;
};

type VisitaStatusContexto = {
  id: string;
  negocio_id: string | null;
  status: string;
};

const fmtVisita = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Converte o valor de um input datetime-local em ISO ou null. */
function lerDataHora(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatarDataHora(dataHora: string): string {
  const d = new Date(dataHora);
  if (Number.isNaN(d.getTime())) return dataHora;
  return fmtVisita.format(d);
}

async function carregarContextoConversa(
  conversaId: string,
  usuarioId: string,
): Promise<ContextoConversa | null> {
  const supabase = await createClient();

  const { data: conversa, error: conversaErro } = await supabase
    .from("conversas")
    .select("id, negocio_id")
    .eq("id", conversaId)
    .maybeSingle();

  if (conversaErro || !conversa?.negocio_id) return null;

  const [{ data: negocio, error: negocioErro }, { data: papeis }] =
    await Promise.all([
      supabase
        .from("negocios")
        .select("id, imovel_id, status")
        .eq("id", conversa.negocio_id)
        .maybeSingle(),
      supabase
        .from("papeis_negocio")
        .select("papel")
        .eq("negocio_id", conversa.negocio_id)
        .eq("usuario_id", usuarioId)
        .eq("ativo", true),
    ]);

  if (negocioErro || !negocio?.imovel_id) return null;

  return {
    conversaId: conversa.id,
    negocioId: conversa.negocio_id,
    imovelId: negocio.imovel_id,
    negocioStatus: negocio.status,
    papeisUsuario: (papeis ?? []).map((papel) => String(papel.papel)),
  };
}

function usuarioPodeSugerirVisita(
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>,
  contexto: ContextoConversa,
) {
  return (
    sessao.isAdmin ||
    contexto.papeisUsuario.some((papel) => PAPEIS_ANUNCIANTE.includes(papel))
  );
}

function usuarioPodeResponderVisita(
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>,
  contexto: ContextoConversa,
) {
  return sessao.isAdmin || contexto.papeisUsuario.includes("comprador");
}

async function inserirMensagemVisita(params: {
  conversaId: string;
  autorId: string;
  tipo: "visita_sugerida" | "visita_confirmada" | "visita_recusada";
  corpo: string;
  visita: VisitaChat;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("mensagens").insert({
    conversa_id: params.conversaId,
    autor_id: params.autorId,
    corpo: params.corpo,
    tipo: params.tipo,
    metadata: {
      visita_id: params.visita.id,
      negocio_id: params.visita.negocio_id,
      imovel_id: params.visita.imovel_id,
      data_hora: params.visita.data_hora,
      canal: params.visita.canal,
      observacoes: params.visita.observacoes,
      status: params.visita.status,
    },
  });

  return !error;
}

function revalidarFluxoVisita(conversaId: string, negocioId: string) {
  revalidatePath(`/painel/mensagens/${conversaId}`);
  revalidatePath("/painel/mensagens");
  revalidatePath("/painel/visitas");
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel", "layout");
}

/**
 * Agenda uma nova visita para um imóvel. Insere em `visitas` com
 * solicitante_id = usuário logado e status inicial 'solicitada'.
 * Loga visita_agendada.
 */
export async function agendarVisita(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const imovel_id = String(formData.get("imovel_id") ?? "");
  const canal = String(formData.get("canal") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const data_hora = lerDataHora(formData.get("data_hora"));

  if (!imovel_id) return { error: "Selecione um imóvel." };
  if (!CANAIS_VALIDOS.includes(canal)) return { error: "Canal inválido." };
  if (!data_hora) return { error: "Informe a data e hora da visita." };
  if (new Date(data_hora) <= new Date())
    return { error: "A visita precisa ser numa data futura." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visitas")
    .insert({
      imovel_id,
      data_hora,
      canal,
      observacoes,
      status: "solicitada",
      solicitante_id: sessao.user.id,
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Não foi possível agendar a visita. Tente novamente." };

  await registrarEvento("visita_agendada", {
    entidadeId: data.id,
    payload: { imovel_id, data_hora, canal },
  });

  revalidatePath("/painel/visitas");
  return { message: "Visita agendada." };
}

export async function sugerirVisitaNoChat(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const conversaId = String(formData.get("conversa_id") ?? "");
  const canal = String(formData.get("canal") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const data_hora = lerDataHora(formData.get("data_hora"));

  if (!conversaId) return { error: "Conversa nao identificada." };
  if (!CANAIS_VALIDOS.includes(canal)) return { error: "Canal invalido." };
  if (!data_hora) return { error: "Informe a data e hora da visita." };
  if (new Date(data_hora) <= new Date())
    return { error: "A visita precisa ser numa data futura." };

  const contexto = await carregarContextoConversa(conversaId, sessao.user.id);
  if (!contexto) return { error: "Conversa nao encontrada." };
  if (!usuarioPodeSugerirVisita(sessao, contexto))
    return { error: "Apenas anunciante ou corretor pode sugerir visita." };
  if (["concluido", "perdido"].includes(contexto.negocioStatus))
    return { error: "Nao e possivel agendar visita em negocio encerrado." };

  if (observacoes) {
    const contato = detectarContatoExterno(observacoes);
    if (contato.bloqueado) {
      await registrarTentativaContato({
        conversaId,
        negocioId: contexto.negocioId,
        usuarioId: sessao.user.id,
        entidadeTipo: "visita",
        motivos: contato.motivos,
        textoMascarado: contato.textoMascarado,
      });

      revalidarFluxoVisita(conversaId, contexto.negocioId);
      revalidatePath("/painel/observabilidade");
      return { error: AVISO_CONTATO_EXTERNO };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visitas")
    .insert({
      imovel_id: contexto.imovelId,
      negocio_id: contexto.negocioId,
      data_hora,
      canal,
      observacoes,
      status: "aguardando_confirmacao",
      solicitante_id: sessao.user.id,
    })
    .select("id, negocio_id, imovel_id, data_hora, canal, observacoes, status")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel sugerir a visita. Tente novamente." };

  if (contexto.negocioStatus !== "visita") {
    await supabase
      .from("negocios")
      .update({ status: "visita" })
      .eq("id", contexto.negocioId);
  }

  const visita = data as VisitaChat;
  const mensagemCriada = await inserirMensagemVisita({
    conversaId,
    autorId: sessao.user.id,
    tipo: "visita_sugerida",
    corpo: `Visita sugerida para ${formatarDataHora(data_hora)}.`,
    visita,
  });

  if (!mensagemCriada)
    return { error: "A visita foi criada, mas nao foi possivel publicar no chat." };

  await registrarEvento("visita_sugerida", {
    entidadeId: visita.id,
    payload: {
      conversa_id: conversaId,
      negocio_id: contexto.negocioId,
      imovel_id: contexto.imovelId,
      data_hora,
      canal,
    },
  });

  revalidarFluxoVisita(conversaId, contexto.negocioId);
  return { message: "Visita sugerida." };
}

export async function confirmarVisitaNoChat(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  return responderVisitaNoChat(formData, "confirmada");
}

export async function recusarVisitaNoChat(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  return responderVisitaNoChat(formData, "cancelada");
}

async function responderVisitaNoChat(
  formData: FormData,
  status: "confirmada" | "cancelada",
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const conversaId = String(formData.get("conversa_id") ?? "");
  const visitaId = String(formData.get("visita_id") ?? "");

  if (!conversaId) return { error: "Conversa nao identificada." };
  if (!visitaId) return { error: "Visita nao identificada." };

  const contexto = await carregarContextoConversa(conversaId, sessao.user.id);
  if (!contexto) return { error: "Conversa nao encontrada." };
  if (!usuarioPodeResponderVisita(sessao, contexto))
    return { error: "Apenas o comprador pode responder a visita." };

  const supabase = await createClient();
  const { data: visitaAtual, error: visitaErro } = await supabase
    .from("visitas")
    .select("id, negocio_id, imovel_id, data_hora, canal, observacoes, status")
    .eq("id", visitaId)
    .eq("negocio_id", contexto.negocioId)
    .maybeSingle();

  if (visitaErro || !visitaAtual)
    return { error: "Visita nao encontrada." };

  if (!["solicitada", "aguardando_confirmacao", "reagendada"].includes(visitaAtual.status))
    return { error: "Esta visita nao esta aguardando resposta." };

  const { data, error } = await supabase
    .from("visitas")
    .update({ status })
    .eq("id", visitaId)
    .select("id, negocio_id, imovel_id, data_hora, canal, observacoes, status")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel responder a visita. Tente novamente." };

  const visita = data as VisitaChat;
  const confirmou = status === "confirmada";
  const mensagemCriada = await inserirMensagemVisita({
    conversaId,
    autorId: sessao.user.id,
    tipo: confirmou ? "visita_confirmada" : "visita_recusada",
    corpo: confirmou
      ? `Visita confirmada para ${formatarDataHora(visita.data_hora)}.`
      : `Visita recusada para ${formatarDataHora(visita.data_hora)}.`,
    visita,
  });

  if (!mensagemCriada)
    return { error: "A visita foi atualizada, mas nao foi possivel publicar no chat." };

  await registrarEvento(confirmou ? "visita_confirmada" : "visita_recusada", {
    entidadeId: visita.id,
    payload: {
      conversa_id: conversaId,
      negocio_id: contexto.negocioId,
      status,
    },
  });

  revalidarFluxoVisita(conversaId, contexto.negocioId);
  return { message: confirmou ? "Visita confirmada." : "Visita recusada." };
}

/**
 * Muda o status de uma visita. Loga visita_status_mudada.
 */
export async function mudarStatusVisita(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const visita_id = String(formData.get("visita_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!visita_id) return { error: "Visita não identificada." };
  if (!STATUS_VALIDOS.includes(status)) return { error: "Status inválido." };

  const supabase = await createClient();
  const { data: visitaAtual, error: visitaAtualErro } = await supabase
    .from("visitas")
    .select("id, negocio_id, status")
    .eq("id", visita_id)
    .maybeSingle();

  if (visitaAtualErro || !visitaAtual)
    return { error: "Visita nao encontrada." };

  const visita = visitaAtual as VisitaStatusContexto;
  let negocioStatusAntes: string | null = null;
  let negocioStatusDepois: string | null = null;

  if (status === "realizada") {
    if (!visita.negocio_id)
      return {
        error: "Apenas visitas vinculadas a um negocio podem ser marcadas como realizadas.",
      };

    const { data: negocio, error: negocioErro } = await supabase
      .from("negocios")
      .select("status")
      .eq("id", visita.negocio_id)
      .maybeSingle();

    if (negocioErro || !negocio)
      return { error: "Negocio vinculado nao encontrado." };

    negocioStatusAntes = String(negocio.status);
    if (["concluido", "perdido"].includes(negocioStatusAntes))
      return {
        error:
          "Nao e possivel marcar visita realizada em negocio concluido ou perdido.",
      };
  }

  const { error } = await supabase
    .from("visitas")
    .update({ status })
    .eq("id", visita_id);

  if (error)
    return { error: "Não foi possível mudar o status. Tente novamente." };

  await registrarEvento("visita_status_mudada", {
    entidadeId: visita_id,
    payload: { status, negocio_id: visita.negocio_id },
  });

  if (status === "realizada" && visita.negocio_id) {
    const { data: negocioDepois } = await supabase
      .from("negocios")
      .select("status")
      .eq("id", visita.negocio_id)
      .maybeSingle();

    negocioStatusDepois = negocioDepois?.status ? String(negocioDepois.status) : null;

    if (
      negocioStatusAntes &&
      ["qualificacao", "visita"].includes(negocioStatusAntes) &&
      negocioStatusDepois === "proposta"
    ) {
      await registrarEvento("negocio_status_mudado", {
        entidadeId: visita.negocio_id,
        payload: {
          status: "proposta",
          status_anterior: negocioStatusAntes,
          motivo: "visita_realizada",
          visita_id,
        },
      });
    }
  }

  revalidatePath("/painel/visitas");
  if (visita.negocio_id) {
    revalidatePath("/painel/negocios");
    revalidatePath(`/painel/negocios/${visita.negocio_id}`);
    revalidatePath("/painel/mensagens");
    revalidatePath("/painel", "layout");
  }
  return { message: "Status atualizado." };
}

/**
 * Reagenda uma visita para uma nova data/hora e marca status 'reagendada'.
 * Loga visita_status_mudada (com a nova data no payload).
 */
export async function reagendarVisita(
  _prev: VisitaState,
  formData: FormData,
): Promise<VisitaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const visita_id = String(formData.get("visita_id") ?? "");
  const data_hora = lerDataHora(formData.get("data_hora"));

  if (!visita_id) return { error: "Visita não identificada." };
  if (!data_hora) return { error: "Informe a nova data e hora." };
  if (new Date(data_hora) <= new Date())
    return { error: "A nova data precisa ser no futuro." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visitas")
    .update({ data_hora, status: "reagendada" })
    .eq("id", visita_id);

  if (error)
    return { error: "Não foi possível reagendar a visita. Tente novamente." };

  await registrarEvento("visita_status_mudada", {
    entidadeId: visita_id,
    payload: { status: "reagendada", data_hora },
  });

  revalidatePath("/painel/visitas");
  return { message: "Visita reagendada." };
}
