import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { registrarEvento } from "@/lib/log";
import {
  pacoteAplicaAoTipo,
  pacoteServicoValido,
  TERMO_SERVICO_JURIDICO,
  tipoNegocioServicoValido,
  type OrigemServicoJuridico,
  type PacoteServicoJuridico,
  type TipoNegocioServicoJuridico,
} from "@/lib/servicos-juridicos";

type SessaoServico = {
  user: { id: string };
  isAdmin: boolean;
};

type RegistrarServicoParams = {
  sessao: SessaoServico;
  pacote: string;
  tipoNegocio: string;
  origem: OrigemServicoJuridico;
  imovelId?: string | null;
  negocioId?: string | null;
  observacoes?: string | null;
};

type RegistroServicoResult = {
  contratacaoId?: string;
  negocioId?: string | null;
  imovelId?: string | null;
  error?: string;
};

const STATUS_ATIVOS = ["contratado", "em_atendimento"];

function erroPacoteTipo(pacote: string, tipo: string) {
  if (!pacoteServicoValido(pacote)) return "Pacote juridico invalido.";
  if (!tipoNegocioServicoValido(tipo)) return "Tipo de negocio invalido.";
  if (!pacoteAplicaAoTipo(pacote, tipo))
    return "Este pacote nao se aplica ao tipo de negocio selecionado.";
  return null;
}

async function notificarOperadores(params: {
  negocioId?: string | null;
  contratacaoId: string;
  pacote: PacoteServicoJuridico;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const admin = createAdmin(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const destinatarios = new Set<string>();

    const { data: admins } = await admin.from("admins").select("usuario_id");
    for (const row of admins ?? []) {
      if (row.usuario_id) destinatarios.add(String(row.usuario_id));
    }

    if (params.negocioId) {
      const { data: corretores } = await admin
        .from("papeis_negocio")
        .select("usuario_id")
        .eq("negocio_id", params.negocioId)
        .eq("ativo", true)
        .in("papel", ["corretor", "admin"]);

      for (const row of corretores ?? []) {
        if (row.usuario_id) destinatarios.add(String(row.usuario_id));
      }
    }

    if (destinatarios.size === 0) return;

    await admin.from("notificacoes").insert(
      Array.from(destinatarios).map((usuario_id) => ({
        usuario_id,
        tipo: "sistema",
        titulo: "Servico juridico contratado",
        corpo:
          "Uma nova contratacao de servico juridico foi registrada na plataforma.",
        link: params.negocioId
          ? `/painel/negocios/${params.negocioId}`
          : "/painel/observabilidade?evento=servico_juridico_contratado",
      })),
    );
  } catch {
    // Notificacao operacional nao deve derrubar a contratacao.
  }
}

export async function registrarContratacaoServicoJuridico({
  sessao,
  pacote,
  tipoNegocio,
  origem,
  imovelId,
  negocioId,
  observacoes,
}: RegistrarServicoParams): Promise<RegistroServicoResult> {
  const erro = erroPacoteTipo(pacote, tipoNegocio);
  if (erro) return { error: erro };
  if (!imovelId && !negocioId)
    return { error: "Informe imovel ou negocio para contratar o servico." };

  const pacoteValidado = pacote as PacoteServicoJuridico;
  const tipoValidado = tipoNegocio as TipoNegocioServicoJuridico;
  const supabase = await createClient();

  let imovelAlvo = imovelId || null;
  let negocioTipo = tipoValidado;

  if (negocioId) {
    const [{ data: negocio }, { data: papeis }] = await Promise.all([
      supabase
        .from("negocios")
        .select("id, imovel_id, tipo")
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
    const podeContratar =
      sessao.isAdmin ||
      (papeis ?? []).some((p) =>
        ["proprietario", "corretor", "admin"].includes(String(p.papel)),
      );
    if (!podeContratar)
      return { error: "Voce nao tem permissao para contratar este servico." };

    imovelAlvo = String(negocio.imovel_id);
    negocioTipo = (negocio.tipo ?? tipoValidado ?? "venda") as TipoNegocioServicoJuridico;
  } else if (imovelAlvo) {
    const { data: imovel } = await supabase
      .from("imoveis")
      .select("id, proprietario_id")
      .eq("id", imovelAlvo)
      .maybeSingle();

    if (!imovel) return { error: "Imovel nao encontrado." };
    if (!sessao.isAdmin && imovel.proprietario_id !== sessao.user.id)
      return { error: "Voce nao tem permissao para contratar neste imovel." };
  }

  const erroTipoFinal = erroPacoteTipo(pacoteValidado, negocioTipo);
  if (erroTipoFinal) return { error: erroTipoFinal };

  let contratacaoExistente = null as { id: string } | null;

  if (negocioId) {
    const { data } = await supabase
      .from("servicos_juridicos_contratacoes")
      .select("id")
      .eq("negocio_id", negocioId)
      .in("status", STATUS_ATIVOS)
      .maybeSingle();
    contratacaoExistente = data;
  }

  if (!contratacaoExistente && imovelAlvo) {
    const { data } = await supabase
      .from("servicos_juridicos_contratacoes")
      .select("id")
      .eq("imovel_id", imovelAlvo)
      .is("negocio_id", null)
      .in("status", STATUS_ATIVOS)
      .maybeSingle();
    contratacaoExistente = data;
  }

  const payload = {
    imovel_id: imovelAlvo,
    negocio_id: negocioId || null,
    contratante_id: sessao.user.id,
    tipo_negocio: negocioTipo,
    pacote: pacoteValidado,
    origem,
    status: "contratado",
    aceito_por: sessao.user.id,
    termo_resumo: TERMO_SERVICO_JURIDICO,
    observacoes: observacoes?.trim() || null,
  };

  const query = contratacaoExistente
    ? supabase
        .from("servicos_juridicos_contratacoes")
        .update(payload)
        .eq("id", contratacaoExistente.id)
    : supabase.from("servicos_juridicos_contratacoes").insert(payload);

  const { data: contratacao, error: contratacaoError } = await query
    .select("id, imovel_id, negocio_id")
    .single();

  if (contratacaoError || !contratacao)
    return { error: "Nao foi possivel registrar a contratacao juridica." };

  await registrarEvento("servico_juridico_contratado", {
    entidadeId: contratacao.id,
    payload: {
      imovel_id: contratacao.imovel_id,
      negocio_id: contratacao.negocio_id,
      pacote: pacoteValidado,
      origem,
      tipo_negocio: negocioTipo,
    },
  });

  await notificarOperadores({
    negocioId: contratacao.negocio_id,
    contratacaoId: contratacao.id,
    pacote: pacoteValidado,
  });

  return {
    contratacaoId: contratacao.id,
    negocioId: contratacao.negocio_id,
    imovelId: contratacao.imovel_id,
  };
}

export async function cancelarContratacaoServicoJuridicoImovel(params: {
  sessao: SessaoServico;
  imovelId: string;
}) {
  const supabase = await createClient();
  const { data: imovel } = await supabase
    .from("imoveis")
    .select("id, proprietario_id")
    .eq("id", params.imovelId)
    .maybeSingle();

  if (!imovel) return { error: "Imovel nao encontrado." };
  if (!params.sessao.isAdmin && imovel.proprietario_id !== params.sessao.user.id)
    return { error: "Voce nao tem permissao para alterar este imovel." };

  const { data, error } = await supabase
    .from("servicos_juridicos_contratacoes")
    .update({ status: "cancelado" })
    .eq("imovel_id", params.imovelId)
    .is("negocio_id", null)
    .in("status", STATUS_ATIVOS)
    .select("id")
    .maybeSingle();

  if (error) return { error: "Nao foi possivel cancelar o servico juridico." };
  if (!data) return { ok: true };

  await registrarEvento("servico_juridico_status_mudado", {
    entidadeId: data.id,
    payload: {
      imovel_id: params.imovelId,
      status: "cancelado",
      motivo: "opcao_nao_contratar",
    },
  });

  return { ok: true };
}
