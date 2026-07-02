import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO,
  type AceiteContatoExterno,
  type ContatoLiberado,
  type EstadoContatoExterno,
  type PapelContatoExterno,
  type StatusContatoExterno,
} from "@/lib/contato-externo";

type SessaoContato = {
  user: { id: string };
  isAdmin: boolean;
};

type FluxoRow = {
  id: string;
  status: string;
  liberado_em: string | null;
  recusado_em: string | null;
} | null;

type PapelRow = {
  usuario_id: string;
  papel: string;
  ativo: boolean;
};

type UsuarioContatoRow = {
  usuario_id: string;
  papel: string;
  usuarios:
    | {
        nome: string | null;
        email: string | null;
        telefone: string | null;
      }
    | Array<{
        nome: string | null;
        email: string | null;
        telefone: string | null;
      }>
    | null;
};

const PAPEIS_CONTATO = ["comprador", "proprietario"];

function statusFluxo(status: string | null | undefined): StatusContatoExterno {
  if (status === "liberado" || status === "recusado") return status;
  return "pendente";
}

function criarAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdmin(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function usuarioDoContato(row: UsuarioContatoRow) {
  if (Array.isArray(row.usuarios)) return row.usuarios[0] ?? null;
  return row.usuarios ?? null;
}

export async function carregarEstadoContatoExterno(params: {
  negocioId: string;
  statusNegocio: string;
  sessao: SessaoContato | null;
  servicoAtivo: boolean;
}): Promise<EstadoContatoExterno | null> {
  if (!params.sessao) return null;

  const supabase = await createClient();
  const [{ data: fluxo }, { data: papeis }, { data: aceites }] =
    await Promise.all([
      supabase
        .from("negocio_contato_externo_fluxos")
        .select("id, status, liberado_em, recusado_em")
        .eq("negocio_id", params.negocioId)
        .maybeSingle(),
      supabase
        .from("papeis_negocio")
        .select("usuario_id, papel, ativo")
        .eq("negocio_id", params.negocioId)
        .eq("ativo", true)
        .in("papel", PAPEIS_CONTATO),
      supabase
        .from("negocio_contato_externo_aceites")
        .select("usuario_id, papel, decisao, criado_em")
        .eq("negocio_id", params.negocioId),
    ]);

  const fluxoRow = fluxo as FluxoRow;
  const aceitesContato = (aceites ?? []) as AceiteContatoExterno[];
  const mostrar =
    !params.servicoAtivo &&
    (Boolean(fluxoRow) ||
      STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO.includes(
        params.statusNegocio as (typeof STATUS_NEGOCIO_PERMITE_CONTATO_EXTERNO)[number],
      ));

  if (!mostrar) return null;

  const papeisAtivos = (papeis ?? []) as PapelRow[];
  const meusPapeis = papeisAtivos
    .filter((papel) => papel.usuario_id === params.sessao?.user.id)
    .map((papel) => papel.papel);
  const meuPapel = (meusPapeis.includes("comprador")
    ? "comprador"
    : meusPapeis.includes("proprietario")
      ? "proprietario"
      : null) as PapelContatoExterno | null;
  const meuAceite = meuPapel
    ? aceitesContato.find(
        (aceite) =>
          aceite.usuario_id === params.sessao?.user.id &&
          aceite.papel === meuPapel,
      )
    : null;
  const status = statusFluxo(fluxoRow?.status);
  const temCompradorAceito = aceitesContato.some(
    (aceite) => aceite.papel === "comprador" && aceite.decisao === "aceitou",
  );
  const temProprietarioAceito = aceitesContato.some(
    (aceite) =>
      aceite.papel === "proprietario" && aceite.decisao === "aceitou",
  );
  const temRecusa = aceitesContato.some(
    (aceite) => aceite.decisao === "recusou",
  );
  const podeResponder =
    Boolean(meuPapel) &&
    !meuAceite &&
    status === "pendente" &&
    !["concluido", "perdido"].includes(params.statusNegocio);

  let contatos: ContatoLiberado[] = [];
  if (status === "liberado") {
    const aceitos = aceitesContato
      .filter((aceite) => aceite.decisao === "aceitou")
      .map((aceite) => ({
        usuarioId: aceite.usuario_id,
        papel: aceite.papel,
      }));
    const idsAceitos = [...new Set(aceitos.map((item) => item.usuarioId))];
    const admin = criarAdminClient();

    if (admin && idsAceitos.length > 0) {
      const { data } = await admin
        .from("papeis_negocio")
        .select("usuario_id, papel, usuarios(nome, email, telefone)")
        .eq("negocio_id", params.negocioId)
        .eq("ativo", true)
        .in("usuario_id", idsAceitos)
        .in("papel", PAPEIS_CONTATO);

      contatos = ((data ?? []) as unknown as UsuarioContatoRow[])
        .filter((row) =>
          aceitos.some(
            (aceite) =>
              aceite.usuarioId === row.usuario_id && aceite.papel === row.papel,
          ),
        )
        .map((row) => {
          const usuario = usuarioDoContato(row);
          return {
            usuario_id: row.usuario_id,
            papel: row.papel as PapelContatoExterno,
            nome: usuario?.nome ?? null,
            email: usuario?.email ?? null,
            telefone: usuario?.telefone ?? null,
          };
        });
    }
  }

  return {
    mostrar,
    negocioId: params.negocioId,
    status,
    liberadoEm: fluxoRow?.liberado_em ?? null,
    recusadoEm: fluxoRow?.recusado_em ?? null,
    aceites: aceitesContato,
    meuPapel,
    podeResponder,
    temCompradorAceito,
    temProprietarioAceito,
    temRecusa,
    contatos,
  };
}
