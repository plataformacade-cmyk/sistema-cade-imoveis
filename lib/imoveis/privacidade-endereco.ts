import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Sessao } from "@/lib/auth";

export type ImovelPublico = {
  id: string;
  tipo: string | null;
  tipo_negocio: string | null;
  bairro: string | null;
  cidade: string | null;
  uf?: string | null;
  quartos: number | null;
  vagas: number | null;
  area_m2: number | null;
  banheiros?: number | null;
  valor_anuncio: number | null;
  fotos: string[] | null;
};

export type ImovelDetalhePrivado = ImovelPublico & {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  ano_construcao: number | null;
  caracteristicas: Record<string, unknown> | null;
  status: string;
  proprietario_id: string;
  atualizado_em?: string | null;
};

const COLUNAS_CARD =
  "id, tipo, tipo_negocio, bairro, cidade, quartos, vagas, area_m2, valor_anuncio, fotos";

const COLUNAS_DETALHE =
  "id, proprietario_id, logradouro, numero, complemento, cep, bairro, cidade, uf, tipo, tipo_negocio, area_m2, quartos, vagas, ano_construcao, caracteristicas, valor_anuncio, fotos, status";

function textoFiltro(valor: string | undefined) {
  const limpo = valor
    ?.replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return limpo || undefined;
}

export function enderecoPublico(imovel: {
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}) {
  const cidadeUf =
    imovel.cidade && imovel.uf
      ? `${imovel.cidade}/${imovel.uf}`
      : (imovel.cidade ?? "");

  return [imovel.bairro, cidadeUf].filter(Boolean).join(" - ");
}

export function enderecoCompleto(imovel: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}) {
  const ruaNumero = [imovel.logradouro, imovel.numero]
    .filter(Boolean)
    .join(", ");
  const local = enderecoPublico(imovel);

  return [
    ruaNumero,
    imovel.complemento,
    local,
    imovel.cep ? `CEP ${imovel.cep}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
}

export async function usuarioPodeVerEnderecoImovel(
  imovel: { id: string; proprietario_id: string },
  sessao: Sessao | null,
) {
  if (!sessao) return false;
  if (sessao.isAdmin || imovel.proprietario_id === sessao.user.id) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("papeis_negocio")
    .select("id, negocios!inner(imovel_id)")
    .eq("usuario_id", sessao.user.id)
    .eq("ativo", true)
    .eq("negocios.imovel_id", imovel.id)
    .limit(1);

  return Boolean(data?.length);
}

export async function buscarImoveisPublicos(params: {
  q?: string;
  tipo?: string;
  tipoNegocio?: string;
  bairro?: string;
  quartosMin?: number;
  valorMin?: number;
  valorMax?: number;
  limit?: number;
}) {
  const admin = createAdminClient();
  const q = textoFiltro(params.q);
  const bairro = textoFiltro(params.bairro);
  let query = admin
    .from("imoveis")
    .select(COLUNAS_CARD)
    .eq("status", "ativo")
    .order("criado_em", { ascending: false })
    .limit(params.limit ?? 60);

  if (q) {
    const termo = `%${q}%`;
    query = query.or(
      `bairro.ilike.${termo},cidade.ilike.${termo},tipo.ilike.${termo},tipo_negocio.ilike.${termo}`,
    );
  }
  if (params.tipo) query = query.eq("tipo", params.tipo);
  if (params.tipoNegocio) query = query.eq("tipo_negocio", params.tipoNegocio);
  if (bairro) query = query.ilike("bairro", `%${bairro}%`);
  if (params.quartosMin != null) query = query.gte("quartos", params.quartosMin);
  if (params.valorMin != null) query = query.gte("valor_anuncio", params.valorMin);
  if (params.valorMax != null) query = query.lte("valor_anuncio", params.valorMax);

  const { data } = await query;
  return (data ?? []) as ImovelPublico[];
}

export async function buscarImovelPublicoDetalhe(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("imoveis")
    .select(COLUNAS_DETALHE)
    .eq("id", id)
    .single();

  if (!data || data.status !== "ativo") return null;
  return data as ImovelDetalhePrivado;
}
