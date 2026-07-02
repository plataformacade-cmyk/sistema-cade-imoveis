"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import {
  STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO,
  TERMO_CONTATO_EXTERNO,
  type DecisaoContatoExterno,
  type PapelContatoExterno,
} from "@/lib/contato-externo";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type ContatoExternoState = { error?: string; message?: string };

type Sessao = NonNullable<Awaited<ReturnType<typeof getSessao>>>;

const STATUS_SERVICO_ATIVO = ["contratado", "em_atendimento"];

function revalidarContatoExterno(negocioId: string) {
  revalidatePath(`/painel/negocios/${negocioId}`);
  revalidatePath(`/painel/negocios/${negocioId}/documentos`);
  revalidatePath(`/painel/negocios/${negocioId}/contrato`);
  revalidatePath("/painel/negocios");
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel/observabilidade");
  revalidatePath("/painel", "layout");
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdmin(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function notificarParticipantes(params: {
  negocioId: string;
  autorId: string;
  titulo: string;
  corpo: string;
}) {
  const admin = adminClient();
  if (!admin) return;

  try {
    const { data: papeis } = await admin
      .from("papeis_negocio")
      .select("usuario_id")
      .eq("negocio_id", params.negocioId)
      .eq("ativo", true)
      .neq("usuario_id", params.autorId);

    const ids = [
      ...new Set((papeis ?? []).map((papel) => String(papel.usuario_id))),
    ].filter(Boolean);
    if (ids.length === 0) return;

    await admin.from("notificacoes").insert(
      ids.map((usuario_id) => ({
        usuario_id,
        tipo: "sistema",
        titulo: params.titulo,
        corpo: params.corpo,
        link: `/painel/negocios/${params.negocioId}`,
      })),
    );
  } catch {
    // Notificacao nao deve impedir o aceite.
  }
}

async function carregarContexto(negocioId: string, sessao: Sessao) {
  const supabase = await createClient();
  const [{ data: negocio }, { data: papeis }] = await Promise.all([
    supabase
      .from("negocios")
      .select("id, imovel_id, status")
      .eq("id", negocioId)
      .maybeSingle(),
    supabase
      .from("papeis_negocio")
      .select("papel")
      .eq("negocio_id", negocioId)
      .eq("usuario_id", sessao.user.id)
      .eq("ativo", true),
  ]);

  if (!negocio) return { error: "Negocio nao encontrado." };
  const papeisUsuario = (papeis ?? []).map((papel) => String(papel.papel));
  const papel = (papeisUsuario.includes("comprador")
    ? "comprador"
    : papeisUsuario.includes("proprietario")
      ? "proprietario"
      : null) as PapelContatoExterno | null;

  if (!papel)
    return {
      error:
        "Apenas comprador ou proprietario podem autorizar o compartilhamento.",
    };
  if (["concluido", "perdido"].includes(String(negocio.status)))
    return { error: "Negocio concluido ou perdido nao libera contato externo." };
  if (
    !STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO.includes(
      String(negocio.status) as (typeof STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO)[number],
    )
  )
    return {
      error:
        "O compartilhamento de contato fica disponivel apos proposta aceita.",
    };

  const { data: servicoNegocio } = await supabase
    .from("servicos_juridicos_contratacoes")
    .select("id")
    .eq("negocio_id", negocioId)
    .in("status", STATUS_SERVICO_ATIVO)
    .limit(1);
  const { data: servicoImovel } = negocio.imovel_id
    ? await supabase
        .from("servicos_juridicos_contratacoes")
        .select("id")
        .eq("imovel_id", negocio.imovel_id)
        .in("status", STATUS_SERVICO_ATIVO)
        .limit(1)
    : { data: [] };

  if ((servicoNegocio?.length ?? 0) > 0 || (servicoImovel?.length ?? 0) > 0)
    return {
      error:
        "Este negocio ja possui servico juridico ativo. Use o fluxo juridico contratado.",
    };

  return {
    negocio: {
      id: String(negocio.id),
      imovelId: String(negocio.imovel_id ?? ""),
      status: String(negocio.status),
    },
    papel,
  };
}

async function garantirFluxo(negocioId: string) {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("negocio_contato_externo_fluxos")
    .select("id, status")
    .eq("negocio_id", negocioId)
    .maybeSingle();
  if (existente) return { fluxo: existente as { id: string; status: string } };

  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("negocio_contato_externo_fluxos")
    .insert({
      negocio_id: negocioId,
      solicitado_por: sessao.user.id,
      termo_resumo: TERMO_CONTATO_EXTERNO,
    })
    .select("id, status")
    .single();

  if (!error && data) return { fluxo: data as { id: string; status: string } };

  const { data: depois } = await supabase
    .from("negocio_contato_externo_fluxos")
    .select("id, status")
    .eq("negocio_id", negocioId)
    .maybeSingle();
  if (depois) return { fluxo: depois as { id: string; status: string } };

  return { error: "Nao foi possivel iniciar o fluxo sem servico contratado." };
}

async function registrarDecisao(
  decisao: DecisaoContatoExterno,
  formData: FormData,
): Promise<ContatoExternoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "").trim();
  if (!negocioId) return { error: "Negocio nao identificado." };

  const contexto = await carregarContexto(negocioId, sessao);
  if ("error" in contexto) return { error: contexto.error };

  const fluxoResultado = await garantirFluxo(negocioId);
  if ("error" in fluxoResultado) return { error: fluxoResultado.error };
  const fluxo = fluxoResultado.fluxo;
  if (fluxo.status !== "pendente")
    return { error: "Este fluxo ja foi encerrado." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("negocio_contato_externo_aceites")
    .insert({
      fluxo_id: fluxo.id,
      negocio_id: negocioId,
      usuario_id: sessao.user.id,
      papel: contexto.papel,
      decisao,
      termo_resumo: TERMO_CONTATO_EXTERNO,
    });

  if (error) {
    if (error.code === "23505")
      return { error: "Voce ja registrou sua decisao para este negocio." };
    return { error: "Nao foi possivel registrar sua decisao." };
  }

  const { data: fluxoDepois } = await supabase
    .from("negocio_contato_externo_fluxos")
    .select("status")
    .eq("id", fluxo.id)
    .maybeSingle();
  const statusDepois = String(fluxoDepois?.status ?? "pendente");

  await registrarEvento(
    decisao === "aceitou" ? "contato_externo_aceito" : "contato_externo_recusado",
    {
      entidadeId: negocioId,
      payload: {
        fluxo_id: fluxo.id,
        papel: contexto.papel,
        status_fluxo: statusDepois,
      },
    },
  );

  await notificarParticipantes({
    negocioId,
    autorId: sessao.user.id,
    titulo:
      decisao === "aceitou"
        ? "Contato externo autorizado"
        : "Contato externo recusado",
    corpo:
      decisao === "aceitou"
        ? "Uma parte autorizou seguir sem servico juridico Cade."
        : "Uma parte recusou seguir sem servico juridico Cade.",
  });

  if (statusDepois === "liberado") {
    await registrarEvento("contato_externo_liberado", {
      entidadeId: negocioId,
      payload: { fluxo_id: fluxo.id },
    });
    await notificarParticipantes({
      negocioId,
      autorId: sessao.user.id,
      titulo: "Contatos liberados",
      corpo:
        "Comprador e proprietario autorizaram o compartilhamento de contato.",
    });
  }

  revalidarContatoExterno(negocioId);
  return {
    message:
      decisao === "aceitou"
        ? "Autorizacao registrada."
        : "Recusa registrada.",
  };
}

export async function aceitarCompartilhamentoContato(
  _prev: ContatoExternoState,
  formData: FormData,
): Promise<ContatoExternoState> {
  return registrarDecisao("aceitou", formData);
}

export async function recusarCompartilhamentoContato(
  _prev: ContatoExternoState,
  formData: FormData,
): Promise<ContatoExternoState> {
  return registrarDecisao("recusou", formData);
}
