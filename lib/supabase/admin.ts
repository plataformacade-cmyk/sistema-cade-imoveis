import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

function limparValorEnv(valor: string | undefined, nome: string) {
  const limpo = valor?.replace(/\uFEFF/g, "").trim();

  if (!limpo) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${nome}`);
  }

  return limpo;
}

export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = limparValorEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
