import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { registrarEventoAdmin } from "@/lib/log";
import { buscarContextoSistemaHermes } from "@/lib/hermes/contexto";

export type JobAutomacaoHermes =
  | "todos"
  | "suporte_temas"
  | "negocios_travados"
  | "repescagem_leads"
  | "precos_bairro"
  | "saude_sistema";

type ResultadoItem = {
  job: JobAutomacaoHermes;
  chave: string;
  criado: boolean;
  resumo: string;
};

type ExecucaoParams = {
  job?: JobAutomacaoHermes;
  dryRun?: boolean;
  agora?: Date;
};

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type ImovelLocalEmbed = { bairro?: string | null; cidade?: string | null };

function primeiroEmbed<T>(valor: T | T[] | null | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

const JOBS: JobAutomacaoHermes[] = [
  "suporte_temas",
  "negocios_travados",
  "repescagem_leads",
  "precos_bairro",
  "saude_sistema",
];

const TEMAS_SUPORTE = [
  {
    id: "documentos",
    rotulo: "Documentos e checklist",
    termos: ["documento", "certidao", "certidão", "matricula", "matrícula", "contrato"],
  },
  {
    id: "visitas",
    rotulo: "Visitas e agenda",
    termos: ["visita", "agendar", "horario", "horário", "confirmar"],
  },
  {
    id: "propostas",
    rotulo: "Propostas e negociação",
    termos: ["proposta", "contraproposta", "negociar", "valor", "preco", "preço"],
  },
  {
    id: "locacao",
    rotulo: "Locação e garantias",
    termos: ["aluguel", "locacao", "locação", "fiador", "caucao", "caução", "seguro fianca"],
  },
  {
    id: "anuncio",
    rotulo: "Anúncio do imóvel",
    termos: ["anunciar", "anuncio", "anúncio", "foto", "descricao", "descrição"],
  },
] as const;

function isoDia(data: Date) {
  return data.toISOString().slice(0, 10);
}

function texto(valor: unknown, limite = 400) {
  if (typeof valor !== "string") return "";
  return valor
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

function normalizar(valor: unknown) {
  return texto(valor, 1000)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function listarAdmins(admin: SupabaseAdmin) {
  const { data } = await admin.from("admins").select("usuario_id");
  return (data ?? []).map((row) => row.usuario_id).filter(Boolean) as string[];
}

async function notificarAdmins(
  admin: SupabaseAdmin,
  params: { titulo: string; corpo: string; link?: string | null },
) {
  const admins = await listarAdmins(admin);
  if (admins.length === 0) return 0;
  const { data } = await admin
    .from("notificacoes")
    .insert(
      admins.map((usuarioId) => ({
        usuario_id: usuarioId,
        tipo: "sistema",
        titulo: params.titulo,
        corpo: params.corpo,
        link: params.link ?? "/painel/observabilidade",
      })),
    )
    .select("id");
  return data?.length ?? 0;
}

async function registrarExecucao(
  admin: SupabaseAdmin,
  params: {
    dryRun: boolean;
    chave: string;
    tipo:
      | "suporte_tema_recorrente"
      | "negocio_travado_followup"
      | "lead_repescagem_followup"
      | "preco_bairro_alerta"
      | "saude_sistema_alerta"
      | "job_manual";
    alvoTipo?: string | null;
    alvoId?: string | null;
    resumo: string;
    payload?: Record<string, unknown>;
  },
) {
  if (params.dryRun) return { criado: true, dryRun: true };

  const { data, error } = await admin
    .from("hermes_automacoes_execucoes")
    .insert({
      chave: params.chave,
      tipo: params.tipo,
      alvo_tipo: params.alvoTipo ?? null,
      alvo_id: params.alvoId ?? null,
      resumo: params.resumo,
      payload: params.payload ?? {},
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { criado: false, dryRun: false, id: null };
  if (error) throw error;
  return { criado: Boolean(data?.id), dryRun: false, id: data?.id ?? null };
}

async function criarHandoffHumanoNegocioTravado(
  admin: SupabaseAdmin,
  params: {
    negocioId: string;
    automacaoExecucaoId?: string | null;
    motivo: string;
    contexto: Record<string, unknown>;
  },
) {
  const { data, error } = await admin
    .from("negocio_handoffs_humanos")
    .insert({
      negocio_id: params.negocioId,
      automacao_execucao_id: params.automacaoExecucaoId ?? null,
      origem: "hermes_negocio_travado",
      motivo: params.motivo,
      contexto: params.contexto,
      prioridade: "alta",
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { criado: false, id: null };
  if (error) throw error;
  return { criado: Boolean(data?.id), id: data?.id ?? null };
}

async function criarHandoffHumanoRepescagem(
  admin: SupabaseAdmin,
  params: {
    negocioId: string;
    automacaoExecucaoId?: string | null;
    motivo: string;
    contexto: Record<string, unknown>;
  },
) {
  const { data, error } = await admin
    .from("negocio_handoffs_humanos")
    .insert({
      negocio_id: params.negocioId,
      automacao_execucao_id: params.automacaoExecucaoId ?? null,
      origem: "hermes_repescagem",
      motivo: params.motivo,
      contexto: params.contexto,
      prioridade: "normal",
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { criado: false, id: null };
  if (error) throw error;
  return { criado: Boolean(data?.id), id: data?.id ?? null };
}

async function jobSuporteTemas(
  admin: SupabaseAdmin,
  params: { dia: string; dryRun: boolean; agora: Date },
) {
  const desde = new Date(params.agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("suporte_mensagens")
    .select("corpo, criado_em")
    .eq("autor", "usuario")
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(200);

  const textos = (data ?? []).map((row) => normalizar(row.corpo));
  const resultados: ResultadoItem[] = [];

  for (const tema of TEMAS_SUPORTE) {
    const count = textos.filter((mensagem) =>
      tema.termos.some((termo) => mensagem.includes(normalizar(termo))),
    ).length;
    if (count < 2) continue;

    const chave = `suporte-tema:${params.dia}:${tema.id}`;
    const resumo = `${count} mensagens de suporte nos ultimos 7 dias sobre ${tema.rotulo}.`;
    const execucao = await registrarExecucao(admin, {
      dryRun: params.dryRun,
      chave,
      tipo: "suporte_tema_recorrente",
      alvoTipo: "suporte",
      resumo,
      payload: { tema: tema.id, rotulo: tema.rotulo, mensagens_7d: count },
    });

    if (execucao.criado && !params.dryRun) {
      await notificarAdmins(admin, {
        titulo: `Tema recorrente: ${tema.rotulo}`,
        corpo: resumo,
        link: "/painel/suporte",
      });
      await registrarEventoAdmin("hermes_alerta_criado", {
        payload: { tipo: "suporte_tema_recorrente", chave, tema: tema.id, count },
      });
    }

    resultados.push({ job: "suporte_temas", chave, criado: execucao.criado, resumo });
  }

  return resultados;
}

async function jobNegociosTravados(
  admin: SupabaseAdmin,
  params: { dia: string; dryRun: boolean; agora: Date },
) {
  const corte = new Date(params.agora.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sugeridoPara = new Date(params.agora.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("negocios")
    .select("id, status, tipo, atualizado_em, imoveis(bairro, cidade)")
    .in("status", ["qualificacao", "visita", "proposta", "documentos", "contrato"])
    .lt("atualizado_em", corte)
    .order("atualizado_em", { ascending: true })
    .limit(30);

  const resultados: ResultadoItem[] = [];
  for (const negocio of data ?? []) {
    const chave = `negocio-travado:${params.dia}:${negocio.id}`;
    const imovel = primeiroEmbed(negocio.imoveis as ImovelLocalEmbed | ImovelLocalEmbed[] | null);
    const local = [imovel?.bairro, imovel?.cidade].filter(Boolean).join(", ");
    const resumo = `Negocio em ${negocio.status} sem atualizacao ha mais de 3 dias${local ? ` (${local})` : ""}.`;
    const execucao = await registrarExecucao(admin, {
      dryRun: params.dryRun,
      chave,
      tipo: "negocio_travado_followup",
      alvoTipo: "negocio",
      alvoId: negocio.id,
      resumo,
      payload: {
        status: negocio.status,
        tipo: negocio.tipo,
        atualizado_em: negocio.atualizado_em,
        followup_sugerido_para: sugeridoPara,
      },
    });

    if (execucao.criado && !params.dryRun) {
      const handoff = await criarHandoffHumanoNegocioTravado(admin, {
        negocioId: negocio.id,
        automacaoExecucaoId: execucao.id,
        motivo: resumo,
        contexto: {
          status: negocio.status,
          tipo: negocio.tipo,
          atualizado_em: negocio.atualizado_em,
          local,
          chave_automacao: chave,
          followup_sugerido_para: sugeridoPara,
        },
      });
      await notificarAdmins(admin, {
        titulo: "Handoff comercial criado",
        corpo: `${resumo} Um operador deve assumir o contato humano.`,
        link: `/painel/negocios/${negocio.id}`,
      });
      if (handoff.criado) {
        await registrarEventoAdmin("handoff_humano_criado", {
          entidadeId: negocio.id,
          payload: {
            handoff_id: handoff.id,
            automacao_execucao_id: execucao.id,
            origem: "hermes_negocio_travado",
          },
        });
      }
      await registrarEventoAdmin("hermes_alerta_criado", {
        entidadeId: negocio.id,
        payload: {
          tipo: "negocio_travado_followup",
          chave,
          status: negocio.status,
          handoff_id: handoff.id,
        },
      });
    }

    resultados.push({ job: "negocios_travados", chave, criado: execucao.criado, resumo });
  }
  return resultados;
}

type ImovelPreco = {
  id: string;
  bairro: string | null;
  cidade: string | null;
  tipo: string | null;
  tipo_negocio: string | null;
  valor_anuncio: number | null;
};

type RepescagemRow = {
  id: string;
  negocio_id: string;
  comprador_id: string | null;
  motivo_perda: string | null;
  status: string;
  tentativas: number;
  proxima_tentativa_em: string | null;
  negocios: {
    id: string;
    status: string;
    tipo: string | null;
    imovel_id: string | null;
    imoveis: {
      id: string;
      bairro: string | null;
      cidade: string | null;
      tipo: string | null;
      tipo_negocio: string | null;
      valor_anuncio: number | null;
    } | null;
  } | null;
};

type ImovelSimilar = {
  id: string;
  titulo: string | null;
  bairro: string | null;
  cidade: string | null;
  tipo: string | null;
  tipo_negocio: string | null;
  valor_anuncio: number | null;
};

async function buscarImoveisSimilares(
  admin: SupabaseAdmin,
  imovel: NonNullable<NonNullable<RepescagemRow["negocios"]>["imoveis"]>,
) {
  let query = admin
    .from("imoveis")
    .select("id, titulo, bairro, cidade, tipo, tipo_negocio, valor_anuncio")
    .eq("status", "ativo")
    .neq("id", imovel.id)
    .limit(12);

  if (imovel.tipo_negocio) query = query.eq("tipo_negocio", imovel.tipo_negocio);
  if (imovel.tipo) query = query.eq("tipo", imovel.tipo);
  if (imovel.cidade) query = query.eq("cidade", imovel.cidade);

  const { data } = await query;
  const candidatos = ((data ?? []) as ImovelSimilar[]).sort((a, b) => {
    const bairroA = a.bairro && imovel.bairro && normalizar(a.bairro) === normalizar(imovel.bairro) ? 0 : 1;
    const bairroB = b.bairro && imovel.bairro && normalizar(b.bairro) === normalizar(imovel.bairro) ? 0 : 1;
    if (bairroA !== bairroB) return bairroA - bairroB;
    const valorBase = Number(imovel.valor_anuncio ?? 0);
    if (!valorBase) return 0;
    return (
      Math.abs(Number(a.valor_anuncio ?? 0) - valorBase) -
      Math.abs(Number(b.valor_anuncio ?? 0) - valorBase)
    );
  });
  return candidatos.slice(0, 4);
}

async function jobRepescagemLeads(
  admin: SupabaseAdmin,
  params: { dia: string; dryRun: boolean; agora: Date },
) {
  const { data } = await admin
    .from("negocio_repescagens")
    .select(
      "id, negocio_id, comprador_id, motivo_perda, status, tentativas, proxima_tentativa_em, negocios(id, status, tipo, imovel_id, imoveis(id, bairro, cidade, tipo, tipo_negocio, valor_anuncio))",
    )
    .in("status", ["pendente", "em_cadencia", "respondido"])
    .eq("parar_cadencia", false)
    .or(`proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${params.agora.toISOString()}`)
    .limit(30);

  const resultados: ResultadoItem[] = [];
  for (const row of ((data ?? []) as unknown as RepescagemRow[])) {
    const negocio = row.negocios;
    const imovel = primeiroEmbed(negocio?.imoveis ?? null);
    if (!negocio || !imovel || negocio.status !== "perdido") continue;

    const proximaTentativa = Number(row.tentativas ?? 0) + 1;
    const chave = `lead-repescagem:${params.dia}:${row.id}:${proximaTentativa}`;
    const similares = await buscarImoveisSimilares(admin, imovel);
    const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");
    const resumo =
      similares.length > 0
        ? `Repescagem do lead com ${similares.length} imovel(is) similar(es)${local ? ` em ${local}` : ""}.`
        : `Repescagem sem imovel similar suficiente${local ? ` para ${local}` : ""}.`;

    const execucao = await registrarExecucao(admin, {
      dryRun: params.dryRun,
      chave,
      tipo: "lead_repescagem_followup",
      alvoTipo: "negocio",
      alvoId: row.negocio_id,
      resumo,
      payload: {
        repescagem_id: row.id,
        tentativa: proximaTentativa,
        similares: similares.map((item) => item.id),
        motivo_perda: row.motivo_perda,
      },
    });

    if (execucao.criado && !params.dryRun) {
      const deveEncerrar = proximaTentativa >= 3 && similares.length === 0;
      const deveHandoff = proximaTentativa >= 3 || similares.length === 0;
      const prox =
        deveEncerrar
          ? null
          : new Date(params.agora.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

      await admin
        .from("negocio_repescagens")
        .update({
          status: deveEncerrar ? "encerrado" : "em_cadencia",
          tentativas: proximaTentativa,
          ultima_tentativa_em: params.agora.toISOString(),
          proxima_tentativa_em: prox,
          imoveis_recomendados: similares,
          automacao_execucao_id: execucao.id ?? null,
          encerrado_em: deveEncerrar ? params.agora.toISOString() : null,
        })
        .eq("id", row.id);

      if (row.comprador_id && similares.length > 0) {
        await admin.from("notificacoes").insert({
          usuario_id: row.comprador_id,
          tipo: "sistema",
          titulo: "Encontramos imoveis similares",
          corpo: "Selecionamos opcoes parecidas com o imovel anterior. Veja se alguma ainda faz sentido.",
          link: `/painel/negocios/${row.negocio_id}`,
        });
      }

      if (deveHandoff) {
        const handoff = await criarHandoffHumanoRepescagem(admin, {
          negocioId: row.negocio_id,
          automacaoExecucaoId: execucao.id,
          motivo:
            similares.length === 0
              ? "Repescagem sem imovel similar suficiente. Operador deve avaliar alternativas."
              : "Repescagem atingiu limite automatico. Operador deve assumir proximo contato.",
          contexto: {
            repescagem_id: row.id,
            tentativa: proximaTentativa,
            similares: similares.map((item) => item.id),
            motivo_perda: row.motivo_perda,
          },
        });
        if (handoff.criado) {
          await registrarEventoAdmin("handoff_humano_criado", {
            entidadeId: row.negocio_id,
            payload: {
              handoff_id: handoff.id,
              origem: "hermes_repescagem",
              repescagem_id: row.id,
            },
          });
        }
      }

      await registrarEventoAdmin(deveEncerrar ? "lead_repescagem_encerrada" : "lead_repescagem_followup", {
        entidadeId: row.negocio_id,
        payload: {
          repescagem_id: row.id,
          tentativa: proximaTentativa,
          similares: similares.map((item) => item.id),
          encerrada: deveEncerrar,
        },
      });
    }

    resultados.push({ job: "repescagem_leads", chave, criado: execucao.criado, resumo });
  }

  return resultados;
}

async function jobPrecosBairro(
  admin: SupabaseAdmin,
  params: { dia: string; dryRun: boolean },
) {
  const { data } = await admin
    .from("imoveis")
    .select("id, bairro, cidade, tipo, tipo_negocio, valor_anuncio")
    .eq("status", "ativo")
    .not("valor_anuncio", "is", null)
    .limit(800);

  const grupos = new Map<string, ImovelPreco[]>();
  for (const imovel of (data ?? []) as ImovelPreco[]) {
    if (!imovel.bairro || !imovel.cidade || !imovel.tipo || !imovel.valor_anuncio) continue;
    const chave = [
      normalizar(imovel.cidade),
      normalizar(imovel.bairro),
      imovel.tipo,
      imovel.tipo_negocio ?? "venda",
    ].join(":");
    const lista = grupos.get(chave) ?? [];
    lista.push(imovel);
    grupos.set(chave, lista);
  }

  const resultados: ResultadoItem[] = [];
  for (const lista of grupos.values()) {
    if (lista.length < 3) continue;
    const media =
      lista.reduce((acc, imovel) => acc + Number(imovel.valor_anuncio ?? 0), 0) / lista.length;
    if (!Number.isFinite(media) || media <= 0) continue;

    for (const imovel of lista) {
      const valor = Number(imovel.valor_anuncio ?? 0);
      const desvio = (valor - media) / media;
      if (Math.abs(desvio) < 0.25) continue;

      const chave = `preco-bairro:${params.dia}:${imovel.id}`;
      const direcao = desvio > 0 ? "acima" : "abaixo";
      const resumo = `Imovel em ${imovel.bairro}, ${imovel.cidade} esta ${Math.round(Math.abs(desvio) * 100)}% ${direcao} da media local comparavel.`;
      const execucao = await registrarExecucao(admin, {
        dryRun: params.dryRun,
        chave,
        tipo: "preco_bairro_alerta",
        alvoTipo: "imovel",
        alvoId: imovel.id,
        resumo,
        payload: {
          bairro: imovel.bairro,
          cidade: imovel.cidade,
          tipo: imovel.tipo,
          tipo_negocio: imovel.tipo_negocio ?? "venda",
          valor,
          media: Math.round(media),
          desvio_percentual: Math.round(desvio * 100),
          amostra: lista.length,
        },
      });

      if (execucao.criado && !params.dryRun) {
        await notificarAdmins(admin, {
          titulo: "Preco fora da media do bairro",
          corpo: resumo,
          link: `/painel/imoveis/${imovel.id}`,
        });
        await registrarEventoAdmin("hermes_alerta_criado", {
          entidadeId: imovel.id,
          payload: { tipo: "preco_bairro_alerta", chave, desvio_percentual: Math.round(desvio * 100) },
        });
      }

      resultados.push({ job: "precos_bairro", chave, criado: execucao.criado, resumo });
      if (resultados.length >= 20) return resultados;
    }
  }

  return resultados;
}

async function jobSaudeSistema(
  admin: SupabaseAdmin,
  params: { dia: string; dryRun: boolean },
) {
  const contexto = await buscarContextoSistemaHermes();
  const contadores = contexto.contadores;
  const alertas: Array<{ id: string; resumo: string; severidade: "info" | "warn" | "error" }> = [];

  if (contadores.suporte_aguardando_humano > 0) {
    alertas.push({
      id: "suporte_humano",
      severidade: "warn",
      resumo: `${contadores.suporte_aguardando_humano} conversa(s) aguardando atendimento humano.`,
    });
  }
  if (contadores.visitas_pendentes >= 5) {
    alertas.push({
      id: "visitas_pendentes",
      severidade: "warn",
      resumo: `${contadores.visitas_pendentes} visita(s) pendentes de confirmacao ou realizacao.`,
    });
  }

  const resultados: ResultadoItem[] = [];
  for (const alerta of alertas) {
    const chave = `saude:${params.dia}:${alerta.id}`;
    const execucao = await registrarExecucao(admin, {
      dryRun: params.dryRun,
      chave,
      tipo: "saude_sistema_alerta",
      alvoTipo: "sistema",
      resumo: alerta.resumo,
      payload: { alerta: alerta.id, severidade: alerta.severidade, contadores },
    });

    if (execucao.criado && !params.dryRun) {
      await notificarAdmins(admin, {
        titulo: "Alerta de saude do sistema",
        corpo: alerta.resumo,
        link: "/painel/observabilidade",
      });
      await registrarEventoAdmin("hermes_alerta_criado", {
        severidade: alerta.severidade,
        payload: { tipo: "saude_sistema_alerta", chave, alerta: alerta.id },
      });
    }

    resultados.push({ job: "saude_sistema", chave, criado: execucao.criado, resumo: alerta.resumo });
  }
  return resultados;
}

export async function executarAutomacoesHermes(params: ExecucaoParams = {}) {
  const admin = createAdminClient();
  const agora = params.agora ?? new Date();
  const dia = isoDia(agora);
  const dryRun = Boolean(params.dryRun);
  const job = params.job ?? "todos";
  const jobs = job === "todos" ? JOBS : [job];
  const resultados: ResultadoItem[] = [];

  for (const item of jobs) {
    if (item === "suporte_temas") {
      resultados.push(...(await jobSuporteTemas(admin, { dia, dryRun, agora })));
    } else if (item === "negocios_travados") {
      resultados.push(...(await jobNegociosTravados(admin, { dia, dryRun, agora })));
    } else if (item === "repescagem_leads") {
      resultados.push(...(await jobRepescagemLeads(admin, { dia, dryRun, agora })));
    } else if (item === "precos_bairro") {
      resultados.push(...(await jobPrecosBairro(admin, { dia, dryRun })));
    } else if (item === "saude_sistema") {
      resultados.push(...(await jobSaudeSistema(admin, { dia, dryRun })));
    }
  }

  await registrarEventoAdmin("hermes_automacao_executada", {
    payload: {
      job,
      dry_run: dryRun,
      total: resultados.length,
      novos: resultados.filter((resultado) => resultado.criado).length,
    },
  });

  return {
    ok: true,
    job,
    dryRun,
    resultados,
    resumo: {
      total: resultados.length,
      novos: resultados.filter((resultado) => resultado.criado).length,
      duplicados_ignorados: resultados.filter((resultado) => !resultado.criado).length,
    },
  };
}
