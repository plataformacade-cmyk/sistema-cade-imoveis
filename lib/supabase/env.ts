function limparValorEnv(valor: string | undefined, nome: string) {
  const limpo = valor?.replace(/\uFEFF/g, "").trim();

  if (!limpo) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${nome}`);
  }

  return limpo;
}

export function getSupabaseEnv() {
  return {
    url: limparValorEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    anonKey: limparValorEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
  };
}
