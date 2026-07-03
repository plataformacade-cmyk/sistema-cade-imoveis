"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { TERMO_CONTATO_EXTERNO } from "@/lib/contato-externo";
import { registrarEvento } from "@/lib/log";

export type SuporteState = {
  error?: string;
  message?: string;
  conversaId?: string;
};

const STATUS_SERVICO_COM_APOIO = ["contratado", "em_atendimento", "concluido"];

function revalidarSuporte(params: { negocioId?: string | null } = {}) {
  revalidatePath("/painel/suporte");
  revalidatePath("/painel/observabilidade");
  revalidatePath("/painel/notificacoes");
  if (params.negocioId) {
    revalidatePath(`/painel/negocios/${params.negocioId}`);
  }
}

function textoCurto(valor: FormDataEntryValue | null, limite: number) {
  return String(valor ?? "").trim().slice(0, limite);
}

function contextoLinha(label: string, valor: string | number | null | undefined) {
  if (valor == null || valor === "") return null;
  return `${label}: ${valor}`;
}

function origemDoTicket(params: {
  temServico: boolean;
  contatoExternoStatus: string | null;
  cartorialStatus: string | null;
}) {
  if (params.temServico) return "servico_cade";
  if (params.contatoExternoStatus === "liberado") return "externo";
  if (params.cartorialStatus) return "cartorial";
  return "manual";
}

async function carregarContextoPosConclusao(negocioId: string, usuarioId: string) {
  const supabase = await createClient();
  const [
    negocioRes,
    papelRes,
    servicosRes,
    contatoExternoRes,
    contratoRes,
    cartorialRes,
    documentosRes,
  ] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, imovel_id, tipo, status, valor_acordado, imoveis(id, logradouro, numero, bairro, cidade)",
      )
      .eq("id", negocioId)
      .maybeSingle(),
    supabase
      .from("papeis_negocio")
      .select("papel")
      .eq("negocio_id", negocioId)
      .eq("usuario_id", usuarioId)
      .eq("ativo", true)
      .in("papel", ["comprador", "proprietario"]),
    supabase
      .from("servicos_juridicos_contratacoes")
      .select("id, pacote, status, origem, negocio_id, imovel_id")
      .eq("negocio_id", negocioId)
      .order("criado_em", { ascending: false }),
    supabase
      .from("negocio_contato_externo_fluxos")
      .select("id, status, liberado_em, recusado_em")
      .eq("negocio_id", negocioId)
      .maybeSingle(),
    supabase
      .from("contratos")
      .select("id, status, versao, revisado_em, assinado_em")
      .eq("negocio_id", negocioId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("negocio_cartorial_fluxos")
      .select("id, status, modo, concluido_em")
      .eq("negocio_id", negocioId)
      .maybeSingle(),
    supabase
      .from("documentos")
      .select("id, status")
      .eq("negocio_id", negocioId),
  ]);

  const negocio = negocioRes.data as
    | {
        id: string;
        imovel_id: string | null;
        tipo: string | null;
        status: string;
        valor_acordado: number | null;
        imoveis:
          | {
              id: string;
              logradouro: string | null;
              numero: string | null;
              bairro: string | null;
              cidade: string | null;
            }
          | Array<{
              id: string;
              logradouro: string | null;
              numero: string | null;
              bairro: string | null;
              cidade: string | null;
            }>
          | null;
      }
    | null;

  if (negocioRes.error || !negocio) {
    return { error: "Negocio nao encontrado." };
  }
  if (negocio.status !== "concluido") {
    return { error: "O ticket pos-conclusao so pode ser aberto em negocio concluido." };
  }

  const papel = String(papelRes.data?.[0]?.papel ?? "");
  if (!papel) {
    return {
      error:
        "Apenas comprador ou proprietario ativo do negocio podem abrir ticket pos-conclusao.",
    };
  }

  const imovel = Array.isArray(negocio.imoveis)
    ? negocio.imoveis[0] ?? null
    : negocio.imoveis;
  let servicos = servicosRes.data ?? [];
  if (negocio.imovel_id) {
    const { data: servicosImovel } = await supabase
      .from("servicos_juridicos_contratacoes")
      .select("id, pacote, status, origem, negocio_id, imovel_id")
      .eq("imovel_id", negocio.imovel_id)
      .order("criado_em", { ascending: false });
    const ids = new Set(servicos.map((item) => item.id));
    servicos = [
      ...servicos,
      ...((servicosImovel ?? []).filter((item) => !ids.has(item.id))),
    ];
  }
  const servico = servicos.find((item) =>
    STATUS_SERVICO_COM_APOIO.includes(String(item.status)),
  );
  const contrato = contratoRes.data ?? null;
  const cartorial = cartorialRes.data ?? null;
  const contatoExterno = contatoExternoRes.data ?? null;
  const documentos = documentosRes.data ?? [];
  const origem = origemDoTicket({
    temServico: Boolean(servico),
    contatoExternoStatus: contatoExterno?.status ?? null,
    cartorialStatus: cartorial?.status ?? null,
  });

  const contexto = {
    negocio_id: negocio.id,
    imovel_id: negocio.imovel_id,
    tipo_negocio: negocio.tipo ?? "venda",
    negocio_status: negocio.status,
    papel_solicitante: papel,
    valor_acordado: negocio.valor_acordado,
    imovel: imovel
      ? {
          id: imovel.id,
          logradouro: imovel.logradouro,
          numero: imovel.numero,
          bairro: imovel.bairro,
          cidade: imovel.cidade,
        }
      : null,
    origem,
    servico_juridico: servico
      ? {
          id: servico.id,
          pacote: servico.pacote,
          status: servico.status,
          origem: servico.origem,
        }
      : null,
    contato_externo: contatoExterno
      ? {
          id: contatoExterno.id,
          status: contatoExterno.status,
          liberado_em: contatoExterno.liberado_em,
          recusado_em: contatoExterno.recusado_em,
        }
      : null,
    contrato: contrato
      ? {
          id: contrato.id,
          status: contrato.status,
          versao: contrato.versao,
          assinado_em: contrato.assinado_em,
          revisado_em: contrato.revisado_em,
        }
      : null,
    cartorial: cartorial
      ? {
          id: cartorial.id,
          status: cartorial.status,
          modo: cartorial.modo,
          concluido_em: cartorial.concluido_em,
        }
      : null,
    documentos: {
      total: documentos.length,
      por_status: documentos.reduce<Record<string, number>>((acc, doc) => {
        const status = String(doc.status ?? "sem_status");
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };

  return { contexto, origem, papel };
}

export async function abrirTicketPosConclusao(
  _prev: SuporteState,
  formData: FormData,
): Promise<SuporteState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = textoCurto(formData.get("negocio_id"), 80);
  const assunto = textoCurto(formData.get("assunto"), 120);
  const descricao = textoCurto(formData.get("descricao"), 2000);
  if (!negocioId) return { error: "Negocio nao identificado." };
  if (!assunto || !descricao) {
    return { error: "Informe o assunto e descreva a solicitacao." };
  }

  const contexto = await carregarContextoPosConclusao(negocioId, sessao.user.id);
  if ("error" in contexto) return { error: contexto.error };

  const supabase = await createClient();
  const { data: conversa, error: conversaError } = await supabase
    .from("suporte_conversas")
    .insert({
      usuario_id: sessao.user.id,
      papel: sessao.papel,
      assunto,
      status: "aguardando_humano",
      negocio_id: negocioId,
      tipo: "pos_conclusao",
      origem_negocio: contexto.origem,
      contexto_snapshot: contexto.contexto,
    })
    .select("id")
    .single();

  if (conversaError || !conversa) {
    return { error: "Nao foi possivel abrir o ticket pos-conclusao." };
  }

  const linhas = [
    contextoLinha("Assunto", assunto),
    contextoLinha("Papel no negocio", contexto.papel),
    "",
    descricao,
  ];
  if (contexto.origem === "externo") {
    linhas.push("", `Observacao: ${TERMO_CONTATO_EXTERNO}`);
  }

  const { error: mensagemError } = await supabase
    .from("suporte_mensagens")
    .insert({
      conversa_id: conversa.id,
      autor: "usuario",
      autor_id: sessao.user.id,
      corpo: linhas.filter((linha) => linha !== null).join("\n"),
    });

  if (mensagemError) {
    return { error: "Ticket criado, mas a primeira mensagem nao foi registrada." };
  }

  await registrarEvento("suporte_pos_conclusao_criado", {
    entidadeId: negocioId,
    payload: {
      conversa_id: conversa.id,
      origem: contexto.origem,
      papel: contexto.papel,
    },
  });

  revalidarSuporte({ negocioId });
  return {
    message: "Ticket pos-conclusao aberto. A equipe vai responder pelo suporte.",
    conversaId: conversa.id,
  };
}

/** Atendente humano (admin) responde uma conversa de suporte. */
export async function responderSuporte(
  _prev: SuporteState,
  formData: FormData,
): Promise<SuporteState> {
  const sessao = await getSessao();
  if (!sessao?.isAdmin) return { error: "Sem permissão." };

  const conversaId = String(formData.get("conversa_id") ?? "");
  const corpo = String(formData.get("corpo") ?? "").trim().slice(0, 2000);
  if (!conversaId || !corpo) return { error: "Escreva uma resposta." };

  const supabase = await createClient();
  const { data: conversa } = await supabase
    .from("suporte_conversas")
    .select("id, tipo, negocio_id, status")
    .eq("id", conversaId)
    .maybeSingle();

  const { error } = await supabase.from("suporte_mensagens").insert({
    conversa_id: conversaId,
    autor: "humano",
    autor_id: sessao.user.id,
    corpo,
  });
  if (error) return { error: "Não foi possível enviar a resposta." };

  // Assume a conversa em nome do atendente (deixa de ficar só na fila).
  await supabase
    .from("suporte_conversas")
    .update({ atendente_id: sessao.user.id, status: "aguardando_humano" })
    .eq("id", conversaId);

  if (conversa?.tipo === "pos_conclusao") {
    await registrarEvento("suporte_pos_conclusao_status_mudado", {
      entidadeId: conversa.negocio_id ?? conversa.id,
      payload: {
        conversa_id: conversa.id,
        status_anterior: conversa.status,
        status: "aguardando_humano",
        acao: "resposta_humana",
      },
    });
  }

  revalidarSuporte({ negocioId: conversa?.negocio_id });
  return { message: "Resposta enviada." };
}

/** Marca a conversa como resolvida. */
export async function resolverSuporte(formData: FormData) {
  const sessao = await getSessao();
  if (!sessao?.isAdmin) return;
  const conversaId = String(formData.get("conversa_id") ?? "");
  if (!conversaId) return;

  const supabase = await createClient();
  const { data: conversa } = await supabase
    .from("suporte_conversas")
    .select("id, tipo, negocio_id, status")
    .eq("id", conversaId)
    .maybeSingle();
  await supabase
    .from("suporte_conversas")
    .update({ status: "resolvida" })
    .eq("id", conversaId);
  if (conversa?.tipo === "pos_conclusao") {
    await registrarEvento("suporte_pos_conclusao_status_mudado", {
      entidadeId: conversa.negocio_id ?? conversa.id,
      payload: {
        conversa_id: conversa.id,
        status_anterior: conversa.status,
        status: "resolvida",
        acao: "resolvida",
      },
    });
  }
  revalidarSuporte({ negocioId: conversa?.negocio_id });
}
