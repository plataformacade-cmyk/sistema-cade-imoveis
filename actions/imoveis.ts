"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type ImovelState = { error?: string; ok?: boolean; id?: string };

const TIPOS = ["casa", "apartamento", "comercial", "terreno"] as const;
const STATUSES = [
  "rascunho",
  "ativo",
  "em_negociacao",
  "vendido",
  "arquivado",
] as const;

type Tipo = (typeof TIPOS)[number];
type Status = (typeof STATUSES)[number];

/** Converte texto de FormData em número ou null (vazio = null). */
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  // aceita vírgula decimal (pt-BR)
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Converte texto de FormData em inteiro ou null. */
function int(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Texto limpo ou null. */
function txt(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Lê o array de fotos serializado em JSON no campo escondido. */
function lerFotos(v: FormDataEntryValue | null): string[] {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    if (Array.isArray(arr))
      return arr.filter((x) => typeof x === "string").slice(0, 10);
  } catch {
    // ignora
  }
  return [];
}

/** Monta o payload validado a partir do FormData. Retorna erro legível se inválido. */
function montarPayload(formData: FormData):
  | { erro: string }
  | { dados: Record<string, unknown> } {
  const tipo = txt(formData.get("tipo")) as Tipo | null;
  const status = (txt(formData.get("status")) ?? "rascunho") as Status;
  const cep = txt(formData.get("cep"));
  const valor_anuncio = num(formData.get("valor_anuncio"));
  const uf = txt(formData.get("uf"));

  if (!tipo || !TIPOS.includes(tipo))
    return { erro: "Selecione um tipo de imóvel válido." };
  if (!STATUSES.includes(status))
    return { erro: "Status inválido." };
  if (!cep) return { erro: "Informe o CEP." };
  if (valor_anuncio === null || valor_anuncio <= 0)
    return { erro: "Informe um valor de anúncio maior que zero." };
  if (uf && uf.length !== 2)
    return { erro: "A UF deve ter 2 caracteres." };

  return {
    dados: {
      cep,
      logradouro: txt(formData.get("logradouro")),
      numero: txt(formData.get("numero")),
      complemento: txt(formData.get("complemento")),
      bairro: txt(formData.get("bairro")),
      cidade: txt(formData.get("cidade")),
      uf: uf ? uf.toUpperCase() : null,
      tipo,
      area_m2: num(formData.get("area_m2")),
      quartos: int(formData.get("quartos")),
      vagas: int(formData.get("vagas")),
      ano_construcao: int(formData.get("ano_construcao")),
      valor_anuncio,
      status,
      fotos: lerFotos(formData.get("fotos")),
    },
  };
}

export async function criarImovel(
  _prev: ImovelState,
  formData: FormData,
): Promise<ImovelState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const r = montarPayload(formData);
  if ("erro" in r) return { error: r.erro };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .insert({ ...r.dados, proprietario_id: sessao.user.id })
    .select("id")
    .single();

  if (error) return { error: "Não foi possível salvar o imóvel." };

  await registrarEvento("imovel_cadastrado", {
    entidadeId: data.id,
    payload: { tipo: r.dados.tipo, status: r.dados.status },
  });

  revalidatePath("/painel/imoveis");
  return { ok: true, id: data.id };
}

export async function editarImovel(
  _prev: ImovelState,
  formData: FormData,
): Promise<ImovelState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const id = txt(formData.get("id"));
  if (!id) return { error: "Imóvel não identificado." };

  const r = montarPayload(formData);
  if ("erro" in r) return { error: r.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("imoveis")
    .update(r.dados)
    .eq("id", id);

  if (error) return { error: "Não foi possível atualizar o imóvel." };

  await registrarEvento("imovel_editado", {
    entidadeId: id,
    payload: { tipo: r.dados.tipo, status: r.dados.status },
  });

  revalidatePath("/painel/imoveis");
  revalidatePath(`/painel/imoveis/${id}`);
  return { ok: true, id };
}

export async function arquivarImovel(formData: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const id = txt(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("imoveis")
    .update({ status: "arquivado" })
    .eq("id", id);

  if (error) return;

  await registrarEvento("imovel_arquivado", { entidadeId: id });
  revalidatePath("/painel/imoveis");
}
