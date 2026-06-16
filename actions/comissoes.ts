"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { revalidatePath } from "next/cache";

export type ComissaoState = { error?: string; message?: string };

const PAGADORES_VALIDOS = ["proprietario", "comprador", "inquilino"];

/** Converte um valor bruto (string) em número >= 0, ou null se inválido. */
function parseNumero(bruto: string): number | null {
  const n = Number(bruto.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

/**
 * Registra a comissão de um negócio.
 * - Valida que o split captador/vendedor soma 100%.
 * - Calcula valor = base_calculo * percentual / 100.
 * - Insere em `comissoes` e loga comissao_registrada.
 *
 * Recebe FormData (form com useActionState): percentual, base_calculo,
 * pagador, captador_pct, vendedor_pct, negocio_id.
 */
export async function registrarComissao(
  _prev: ComissaoState,
  formData: FormData,
): Promise<ComissaoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessão expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const percentualBruto = String(formData.get("percentual") ?? "").trim();
  const baseBruto = String(formData.get("base_calculo") ?? "").trim();
  const pagador = String(formData.get("pagador") ?? "proprietario");
  const captadorBruto = String(formData.get("captador_pct") ?? "").trim();
  const vendedorBruto = String(formData.get("vendedor_pct") ?? "").trim();

  if (!negocio_id) return { error: "Negócio não identificado." };
  if (percentualBruto === "") return { error: "Informe o percentual." };
  if (baseBruto === "") return { error: "Informe a base de cálculo." };
  if (!PAGADORES_VALIDOS.includes(pagador))
    return { error: "Pagador inválido." };

  const percentual = parseNumero(percentualBruto);
  if (percentual === null || percentual > 100)
    return { error: "Percentual inválido (0 a 100)." };

  const base_calculo = parseNumero(baseBruto);
  if (base_calculo === null) return { error: "Base de cálculo inválida." };

  const captador_pct = parseNumero(captadorBruto);
  const vendedor_pct = parseNumero(vendedorBruto);
  if (captador_pct === null || vendedor_pct === null)
    return { error: "Split inválido." };

  // O split captador/vendedor deve somar exatamente 100%.
  if (Math.round((captador_pct + vendedor_pct) * 100) / 100 !== 100)
    return { error: "O split captador + vendedor deve somar 100%." };

  const valor = Math.round(((base_calculo * percentual) / 100) * 100) / 100;

  const supabase = await createClient();
  const { error } = await supabase.from("comissoes").insert({
    negocio_id,
    percentual,
    base_calculo,
    valor,
    pagador,
    split: { captador_pct, vendedor_pct },
  });

  if (error)
    return { error: "Não foi possível registrar a comissão. Tente novamente." };

  await registrarEvento("comissao_registrada", {
    entidadeId: negocio_id,
    payload: {
      percentual,
      base_calculo,
      valor,
      pagador,
      split: { captador_pct, vendedor_pct },
    },
  });

  revalidatePath(`/painel/negocios/${negocio_id}/contrato`);
  revalidatePath(`/painel/negocios/${negocio_id}`);
  return { message: "Comissão registrada." };
}
