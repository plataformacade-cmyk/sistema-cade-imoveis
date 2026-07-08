import { createClient } from "@/lib/supabase/server";

const TELEFONE_E164_RE = /^\+[1-9]\d{7,14}$/;

export function normalizarTelefoneObrigatorio(valor: string | null | undefined) {
  const raw = String(valor ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (raw.startsWith("+") && TELEFONE_E164_RE.test(`+${digits}`)) {
    return `+${digits}`;
  }

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return null;
}

export async function usuarioTemTelefoneObrigatorio(usuarioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("telefone")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error || !data) return false;
  return Boolean(normalizarTelefoneObrigatorio(data.telefone));
}

