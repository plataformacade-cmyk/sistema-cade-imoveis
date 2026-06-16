"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type GarantiaState = { error?: string; message?: string };

// Tipos de garantia de locação válidos (espelha o CHECK da migration S4.1).
// Garantia é seleção ÚNICA — é exigência legal (uma locação tem uma garantia).
const TIPOS_GARANTIA = [
  "fiador",
  "caucao",
  "seguro_fianca",
  "titulo_capitalizacao",
];

/**
 * Define a garantia de uma locação: tipo_garantia (único) + prazo_meses.
 * Só faz sentido para negócios do tipo 'locacao'.
 */
export async function definirGarantia(
  _prev: GarantiaState,
  formData: FormData,
): Promise<GarantiaState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const tipo_garantia = String(formData.get("tipo_garantia") ?? "");
  const prazoBruto = String(formData.get("prazo_meses") ?? "").trim();

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (!TIPOS_GARANTIA.includes(tipo_garantia))
    return { error: "Tipo de garantia inválido." };

  const prazo_meses = Number(prazoBruto);
  if (!Number.isInteger(prazo_meses) || prazo_meses <= 0)
    return { error: "Prazo (meses) inválido." };

  const supabase = await createClient();

  // Garantia só faz sentido em locação — confere o tipo do negócio.
  const { data: negocio, error: negocioErr } = await supabase
    .from("negocios")
    .select("tipo")
    .eq("id", negocio_id)
    .maybeSingle();

  if (negocioErr || !negocio)
    return { error: "Não foi possível carregar o negócio." };
  if (negocio.tipo !== "locacao")
    return { error: "Garantia só se aplica a negócios de locação." };

  const { error } = await supabase
    .from("negocios")
    .update({ tipo_garantia, prazo_meses })
    .eq("id", negocio_id);

  if (error)
    return { error: "Não foi possível salvar a garantia. Tente novamente." };

  revalidatePath(`/painel/negocios/${negocio_id}/documentos`);
  revalidatePath(`/painel/negocios/${negocio_id}`);
  return { message: "Garantia definida." };
}
