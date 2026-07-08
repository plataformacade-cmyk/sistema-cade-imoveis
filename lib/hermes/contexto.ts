import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buscarMetricasEngajamentoImoveis,
  type MetricaEngajamentoImovel,
} from "@/lib/engajamento/imoveis";

export type EscopoContextoHermes =
  | "sistema"
  | "imovel"
  | "metricas_imovel"
  | "negocio"
  | "suporte";

export type PedidoContextoHermes = {
  escopo: EscopoContextoHermes;
  id?: string;
  limiteMensagens?: number;
};

type ParticipanteNegocioContexto = {
  ativo?: boolean | null;
  papel?: string | null;
  usuarios?: UsuarioNomeEmbed | UsuarioNomeEmbed[] | null;
};

type UsuarioNomeEmbed = { nome?: string | null };

type VisitaContexto = {
  id: string;
  status: string | null;
  data_hora: string | null;
  canal: string | null;
  observacoes: string | null;
  criado_em: string | null;
};

type PropostaContexto = {
  id: string;
  status: string | null;
  valor: number | null;
  condicoes: string | null;
  tipo_negocio: string | null;
  tipo_garantia: string | null;
  prazo_meses: number | null;
  reajuste_indice: string | null;
  dia_vencimento: number | null;
  encargos: string | null;
  criado_em: string | null;
};

type MensagemNegocioContexto = {
  id: string;
  corpo: string | null;
  tipo: string | null;
  criado_em: string | null;
  usuarios?: UsuarioNomeEmbed | UsuarioNomeEmbed[] | null;
};

type MensagemSuporteContexto = {
  id: string;
  autor: string | null;
  corpo: string | null;
  criado_em: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function texto(valor: unknown, limite = 600) {
  if (typeof valor !== "string") return null;
  const limpo = valor
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
  return limpo || null;
}

function mascararContato(valor: unknown, limite = 900) {
  const limpo = texto(valor, limite);
  if (!limpo) return null;
  return limpo
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}\b/g, "[telefone]")
    .replace(/\b(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/\S+/gi, "[whatsapp]");
}

function nomeUsuarioEmbed(valor: UsuarioNomeEmbed | UsuarioNomeEmbed[] | null | undefined) {
  const usuario = Array.isArray(valor) ? valor[0] : valor;
  return texto(usuario?.nome, 80);
}

function validarUuid(id: string | undefined) {
  if (!id || !UUID_RE.test(id)) {
    throw Object.assign(new Error("id_invalido"), { statusCode: 400 });
  }
  return id;
}

function limiteMensagens(valor: number | undefined) {
  if (!Number.isFinite(valor)) return 20;
  return Math.min(Math.max(Math.trunc(valor ?? 20), 1), 30);
}

function metricaParaJson(metrica: MetricaEngajamentoImovel) {
  return {
    visualizacoes: metrica.visualizacoes,
    visitantes_unicos_estimados: metrica.visitantesUnicos,
    duracao_media_ms: metrica.duracaoMediaMs,
    cliques_interesse: metrica.cliquesInteresse,
    interesses_registrados: metrica.interessesRegistrados,
    compartilhamentos: metrica.compartilhamentos,
    taxa_conversao: metrica.taxaConversao,
    origem_principal: metrica.origemPrincipal,
    temperatura: metrica.temperatura,
  };
}

export async function buscarContextoSistemaHermes() {
  const admin = createAdminClient();
  const [
    imoveisAtivos,
    negociosAtivos,
    visitasPendentes,
    propostasPendentes,
    suporteHumano,
  ] = await Promise.all([
    admin.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    admin
      .from("negocios")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(concluido,perdido)"),
    admin
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .in("status", ["aguardando_confirmacao", "confirmada"]),
    admin
      .from("propostas")
      .select("id", { count: "exact", head: true })
      .in("status", ["enviada", "contraproposta"]),
    admin
      .from("suporte_conversas")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_humano"),
  ]);

  return {
    gerado_em: new Date().toISOString(),
    contadores: {
      imoveis_ativos: imoveisAtivos.count ?? 0,
      negocios_em_andamento: negociosAtivos.count ?? 0,
      visitas_pendentes: visitasPendentes.count ?? 0,
      propostas_pendentes: propostasPendentes.count ?? 0,
      suporte_aguardando_humano: suporteHumano.count ?? 0,
    },
  };
}

export async function buscarContextoImovelHermes(imovelId: string) {
  const id = validarUuid(imovelId);
  const admin = createAdminClient();
  const { data: imovel, error } = await admin
    .from("imoveis")
    .select(
      "id, tipo, tipo_negocio, status, bairro, cidade, uf, area_m2, quartos, vagas, valor_anuncio, caracteristicas, atualizado_em",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!imovel) throw Object.assign(new Error("imovel_nao_encontrado"), { statusCode: 404 });

  return {
    id: imovel.id,
    status: imovel.status,
    tipo: imovel.tipo,
    tipo_negocio: imovel.tipo_negocio,
    localizacao: {
      bairro: imovel.bairro,
      cidade: imovel.cidade,
      uf: imovel.uf,
    },
    atributos: {
      area_m2: imovel.area_m2,
      quartos: imovel.quartos,
      vagas: imovel.vagas,
      caracteristicas: imovel.caracteristicas,
    },
    valor_anuncio: imovel.valor_anuncio,
    atualizado_em: imovel.atualizado_em,
  };
}

export async function buscarMetricasImovelHermes(imovelId: string) {
  const id = validarUuid(imovelId);
  const metricas7 = await buscarMetricasEngajamentoImoveis([id], 7);
  const metricas30 = await buscarMetricasEngajamentoImoveis([id], 30);
  return {
    imovel_id: id,
    janela_7d: metricaParaJson(metricas7.get(id)!),
    janela_30d: metricaParaJson(metricas30.get(id)!),
  };
}

export async function buscarContextoNegocioHermes(
  negocioId: string,
  limite = 20,
) {
  const id = validarUuid(negocioId);
  const admin = createAdminClient();
  const mensagensLimite = limiteMensagens(limite);

  const { data: negocio, error } = await admin
    .from("negocios")
    .select(
      "id, imovel_id, tipo, status, valor_acordado, tipo_garantia, prazo_meses, reajuste_indice, dia_vencimento, encargos, criado_em, atualizado_em, imoveis(id, tipo, tipo_negocio, status, bairro, cidade, uf, valor_anuncio), papeis_negocio(usuario_id, papel, ativo, usuarios(nome))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!negocio) throw Object.assign(new Error("negocio_nao_encontrado"), { statusCode: 404 });

  const [{ data: visitas }, { data: propostas }, { data: qualificacao }, { data: conversa }] =
    await Promise.all([
      admin
        .from("visitas")
        .select("id, status, data_hora, canal, observacoes, criado_em")
        .eq("negocio_id", id)
        .order("data_hora", { ascending: false })
        .limit(10),
      admin
        .from("propostas")
        .select(
          "id, status, valor, condicoes, tipo_negocio, tipo_garantia, prazo_meses, reajuste_indice, dia_vencimento, encargos, criado_em",
        )
        .eq("negocio_id", id)
        .order("criado_em", { ascending: false })
        .limit(10),
      admin
        .from("negocio_qualificacoes")
        .select("resumo, temperatura, concluida_em")
        .eq("negocio_id", id)
        .maybeSingle(),
      admin.from("conversas").select("id").eq("negocio_id", id).maybeSingle(),
    ]);

  const { data: mensagens } = conversa?.id
    ? await admin
        .from("mensagens")
        .select("id, autor_id, corpo, tipo, metadata, criado_em, usuarios(nome)")
        .eq("conversa_id", conversa.id)
        .order("criado_em", { ascending: false })
        .limit(mensagensLimite)
    : { data: [] };

  const participanteRows = Array.isArray(negocio.papeis_negocio)
    ? (negocio.papeis_negocio as ParticipanteNegocioContexto[])
    : [];

  return {
    negocio: {
      id: negocio.id,
      tipo: negocio.tipo,
      status: negocio.status,
      valor_acordado: negocio.valor_acordado,
      locacao: {
        tipo_garantia: negocio.tipo_garantia,
        prazo_meses: negocio.prazo_meses,
        reajuste_indice: negocio.reajuste_indice,
        dia_vencimento: negocio.dia_vencimento,
        encargos: mascararContato(negocio.encargos, 500),
      },
      criado_em: negocio.criado_em,
      atualizado_em: negocio.atualizado_em,
    },
    imovel: negocio.imoveis,
    participantes: participanteRows
      .filter((p) => p.ativo)
      .map((p) => ({
        papel: p.papel,
        nome: nomeUsuarioEmbed(p.usuarios),
      })),
    qualificacao: qualificacao
      ? {
          resumo: mascararContato(qualificacao.resumo, 1000),
          temperatura: qualificacao.temperatura,
          concluida_em: qualificacao.concluida_em,
        }
      : null,
    visitas: ((visitas ?? []) as VisitaContexto[]).map((v) => ({
      id: v.id,
      status: v.status,
      data_hora: v.data_hora,
      canal: v.canal,
      observacoes: mascararContato(v.observacoes, 500),
      criado_em: v.criado_em,
    })),
    propostas: ((propostas ?? []) as PropostaContexto[]).map((p) => ({
      id: p.id,
      status: p.status,
      valor: p.valor,
      condicoes: mascararContato(p.condicoes, 700),
      tipo_negocio: p.tipo_negocio,
      tipo_garantia: p.tipo_garantia,
      prazo_meses: p.prazo_meses,
      reajuste_indice: p.reajuste_indice,
      dia_vencimento: p.dia_vencimento,
      encargos: mascararContato(p.encargos, 500),
      criado_em: p.criado_em,
    })),
    conversa: {
      id: conversa?.id ?? null,
      mensagens: (mensagens ?? [])
        .slice()
        .reverse()
        .map((m: MensagemNegocioContexto) => ({
          id: m.id,
          autor_nome: nomeUsuarioEmbed(m.usuarios),
          tipo: m.tipo,
          corpo: mascararContato(m.corpo),
          criado_em: m.criado_em,
        })),
    },
  };
}

export async function buscarContextoSuporteHermes(
  conversaId: string,
  limite = 20,
) {
  const id = validarUuid(conversaId);
  const admin = createAdminClient();
  const mensagensLimite = limiteMensagens(limite);
  const { data: conversa, error } = await admin
    .from("suporte_conversas")
    .select(
      "id, usuario_id, papel, assunto, status, tipo, negocio_id, origem_negocio, criado_em, atualizado_em",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!conversa) throw Object.assign(new Error("suporte_nao_encontrado"), { statusCode: 404 });

  const { data: mensagens } = await admin
    .from("suporte_mensagens")
    .select("id, autor, corpo, criado_em")
    .eq("conversa_id", id)
    .order("criado_em", { ascending: false })
    .limit(mensagensLimite);

  return {
    conversa: {
      id: conversa.id,
      papel: conversa.papel,
      assunto: mascararContato(conversa.assunto, 160),
      status: conversa.status,
      tipo: conversa.tipo,
      negocio_id: conversa.negocio_id,
      origem_negocio: conversa.origem_negocio,
      criado_em: conversa.criado_em,
      atualizado_em: conversa.atualizado_em,
    },
    mensagens: (mensagens ?? [])
      .slice()
      .reverse()
      .map((m: MensagemSuporteContexto) => ({
        id: m.id,
        autor: m.autor,
        corpo: mascararContato(m.corpo),
        criado_em: m.criado_em,
      })),
  };
}

export async function buscarContextoHermes(pedido: PedidoContextoHermes) {
  switch (pedido.escopo) {
    case "sistema":
      return buscarContextoSistemaHermes();
    case "imovel":
      return buscarContextoImovelHermes(validarUuid(pedido.id));
    case "metricas_imovel":
      return buscarMetricasImovelHermes(validarUuid(pedido.id));
    case "negocio":
      return buscarContextoNegocioHermes(validarUuid(pedido.id), pedido.limiteMensagens);
    case "suporte":
      return buscarContextoSuporteHermes(validarUuid(pedido.id), pedido.limiteMensagens);
    default:
      throw Object.assign(new Error("escopo_invalido"), { statusCode: 400 });
  }
}
