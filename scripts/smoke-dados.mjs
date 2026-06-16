// Smoke test E2E da camada de dados contra o Supabase LOCAL.
// Exercita: auth + trigger handle_new_user + RLS vitrine pública + RPC demonstrar_interesse.
// Descartável (não vai pro git). Rodar: ANON=.. SROLE=.. node smoke-test.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const admin = createClient(URL, process.env.SROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let ok = 0,
  fail = 0;
const check = (nome, cond, extra = "") => {
  if (cond) {
    console.log("PASS:", nome);
    ok++;
  } else {
    console.log("FAIL:", nome, "::", extra);
    fail++;
  }
};

const senha = "senha-teste-123";

// 1) Criar usuários (auth) → trigger handle_new_user deve popular `usuarios`
const { data: prop, error: e1 } = await admin.auth.admin.createUser({
  email: "prop@teste.local",
  password: senha,
  email_confirm: true,
  user_metadata: { nome: "Proprietário Teste" },
});
check("auth: criar proprietário", !e1 && prop?.user?.id, e1?.message);
const { data: comp, error: e2 } = await admin.auth.admin.createUser({
  email: "comp@teste.local",
  password: senha,
  email_confirm: true,
  user_metadata: { nome: "Comprador Teste" },
});
check("auth: criar comprador", !e2 && comp?.user?.id, e2?.message);

const propId = prop?.user?.id;
const compId = comp?.user?.id;

const { data: uprop } = await admin
  .from("usuarios")
  .select("id")
  .eq("id", propId)
  .maybeSingle();
check("trigger handle_new_user populou usuarios", !!uprop, "row ausente");

// 2) Inserir imóvel ativo do proprietário
const { data: imovel, error: e3 } = await admin
  .from("imoveis")
  .insert({
    proprietario_id: propId,
    tipo: "apartamento",
    cidade: "Uberlândia",
    bairro: "Centro",
    valor_anuncio: 350000,
    status: "ativo",
  })
  .select("id")
  .single();
check("inserir imóvel ativo", !e3 && imovel?.id, e3?.message);

// 3) Vitrine pública: anon deve ler imóveis ativos (bug 1 corrigido)
const anon = createClient(URL, process.env.ANON);
const { data: vitrine, error: e4 } = await anon
  .from("imoveis")
  .select("id")
  .eq("status", "ativo");
check(
  "RLS vitrine: anon lê imóveis ativos",
  !e4 && (vitrine?.length ?? 0) >= 1,
  e4?.message || `rows=${vitrine?.length}`,
);

// 4) "Tenho interesse" como comprador comum via RPC (bug 2 corrigido)
const compClient = createClient(URL, process.env.ANON);
const { error: eLogin } = await compClient.auth.signInWithPassword({
  email: "comp@teste.local",
  password: senha,
});
check("login comprador (email/senha)", !eLogin, eLogin?.message);

const { data: negId, error: e5 } = await compClient.rpc("demonstrar_interesse", {
  p_imovel_id: imovel?.id,
});
check("RPC demonstrar_interesse cria negócio", !e5 && negId, e5?.message);

// 5) Negócio + papéis + conversa criados corretamente
const { data: neg } = await admin
  .from("negocios")
  .select("status, criado_por")
  .eq("id", negId)
  .maybeSingle();
check(
  "negócio aberto pelo comprador",
  neg?.status === "aberto" && neg?.criado_por === compId,
  JSON.stringify(neg),
);
const { data: papeis } = await admin
  .from("papeis_negocio")
  .select("papel")
  .eq("negocio_id", negId);
check(
  "papéis comprador + proprietário",
  papeis?.length === 2,
  `rows=${papeis?.length}`,
);
const { data: conv } = await admin
  .from("conversas")
  .select("id")
  .eq("negocio_id", negId);
check("conversa do negócio criada", conv?.length === 1, `rows=${conv?.length}`);

// 6) Idempotência: 2ª chamada não duplica
const { data: negId2 } = await compClient.rpc("demonstrar_interesse", {
  p_imovel_id: imovel?.id,
});
check("interesse idempotente (não duplica)", negId2 === negId, `${negId2}`);

console.log(`\n=== RESULTADO: ${ok} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
