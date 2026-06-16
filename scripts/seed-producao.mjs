// Seed de DADOS REAIS (demonstração) no banco de PRODUÇÃO do Cadê.
// Cria usuários (auth+trigger), imóveis de Uberlândia com fotos, corretores,
// admin, e alguns negócios/visitas/propostas — pra ver a plataforma cheia.
// Idempotente: e-mails @demo.cade; re-rodar não duplica (checa antes).
// Rodar: SUPA_URL=.. SROLE=.. node scripts/seed-producao.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPA_URL;
const admin = createClient(URL, process.env.SROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENHA = "CadeDemo!2026";
const A = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Fotos Unsplash (imóveis) e pessoas
const CASA = ["1568605114967-8130f3a36994", "1570129477492-45c003edd2be", "1512917774080-9991f1c4c750"];
const APTO = ["1502672260266-1c1ef2d93688", "1493809842364-78817add7ffb", "1522708323590-d24dbb6b0267"];
const INT = ["1560448204-e02f11c3d0e2", "1556911220-bff31c812dba", "1505691938895-1758d7feb511"];
const PESSOAS = ["1500648767791-00dcc994a43e", "1494790108377-be9c29b29330", "1507003211169-0a1dd7228f2d", "1438761681033-6461ffad8d80", "1472099645785-5658abf4ff4e", "1544005313-94ddf0286df2"];

async function acharUsuarioPorEmail(email) {
  // pagina simples; base pequena
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data?.users?.find((u) => u.email === email) ?? null;
}

async function upsertUsuario(email, nome, avatarIdx) {
  let u = await acharUsuarioPorEmail(email);
  if (!u) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: SENHA, email_confirm: true, user_metadata: { nome },
    });
    if (error) { console.log("FALHA criar", email, error.message); return null; }
    u = data.user;
  }
  await admin.from("usuarios").update({ nome, avatar_url: A(PESSOAS[avatarIdx % PESSOAS.length], 400) }).eq("id", u.id);
  return u.id;
}

const PROPRIETARIOS = [
  ["fernando.proprietario@demo.cade", "Fernando Almeida"],
  ["juliana.proprietaria@demo.cade", "Juliana Resende"],
  ["marcos.proprietario@demo.cade", "Marcos Vinícius Costa"],
];
const COMPRADORES = [
  ["ana.compradora@demo.cade", "Ana Clara Souza"],
  ["pedro.comprador@demo.cade", "Pedro Henrique Lima"],
  ["beatriz.compradora@demo.cade", "Beatriz Oliveira"],
];
const CORRETORES = [
  ["carla.corretora@demo.cade", "Carla Menezes", "CRECI-MG 12345"],
  ["rafael.corretor@demo.cade", "Rafael Tavares", "CRECI-MG 67890"],
];

const IMOVEIS = [
  { tipo: "apartamento", bairro: "Santa Mônica", log: "Rua das Acácias", num: "320", area: 78, q: 3, v: 2, val: 420000, fotos: [APTO[0], INT[0], INT[1]] },
  { tipo: "casa", bairro: "Jardim Karaíba", log: "Alameda dos Ipês", num: "150", area: 240, q: 4, v: 4, val: 1450000, fotos: [CASA[0], INT[2], CASA[1]] },
  { tipo: "apartamento", bairro: "Tibery", log: "Av. Anselmo Alves", num: "1100", area: 62, q: 2, v: 1, val: 295000, fotos: [APTO[1], INT[0]] },
  { tipo: "casa", bairro: "Morada da Colina", log: "Rua Bernardo Guimarães", num: "85", area: 320, q: 4, v: 6, val: 1980000, fotos: [CASA[1], CASA[2], INT[1]] },
  { tipo: "apartamento", bairro: "Centro", log: "Av. Afonso Pena", num: "2400", area: 95, q: 3, v: 2, val: 540000, fotos: [APTO[2], INT[2]] },
  { tipo: "comercial", bairro: "Saraiva", log: "Av. João Naves de Ávila", num: "1900", area: 130, q: 0, v: 3, val: 780000, fotos: [INT[0], APTO[0]] },
  { tipo: "casa", bairro: "Granada", log: "Rua dos Coqueiros", num: "42", area: 180, q: 3, v: 2, val: 690000, fotos: [CASA[2], INT[1], CASA[0]] },
  { tipo: "apartamento", bairro: "Santa Mônica", log: "Rua Rio Branco", num: "560", area: 110, q: 3, v: 2, val: 610000, fotos: [APTO[0], INT[2]] },
  { tipo: "terreno", bairro: "Granja Marileusa", log: "Quadra 7 Lote 12", num: "s/n", area: 450, q: 0, v: 0, val: 380000, fotos: [CASA[1]] },
  { tipo: "casa", bairro: "Jardim Inconfidência", log: "Rua Piauí", num: "210", area: 200, q: 3, v: 3, val: 750000, fotos: [CASA[0], INT[0], INT[1]] },
  { tipo: "apartamento", bairro: "Brasil", log: "Rua Goiás", num: "780", area: 70, q: 2, v: 1, val: 320000, fotos: [APTO[1], INT[2]] },
  { tipo: "apartamento", bairro: "Lídice", log: "Av. Cesário Alvim", num: "1450", area: 145, q: 4, v: 3, val: 890000, fotos: [APTO[2], INT[0], INT[1]] },
];

const out = { usuarios: 0, imoveis: 0, corretores: 0, negocios: 0 };

// 1) Admin demo
const adminId = await upsertUsuario("admin@demo.cade", "Equipe Cadê (demo)", 2);
if (adminId) {
  await admin.from("admins").upsert({ usuario_id: adminId }, { onConflict: "usuario_id" });
  out.usuarios++;
}

// 2) Proprietários, compradores, corretores
const propIds = [];
for (let i = 0; i < PROPRIETARIOS.length; i++) {
  const id = await upsertUsuario(PROPRIETARIOS[i][0], PROPRIETARIOS[i][1], i);
  if (id) { propIds.push(id); out.usuarios++; }
}
for (let i = 0; i < COMPRADORES.length; i++) {
  const id = await upsertUsuario(COMPRADORES[i][0], COMPRADORES[i][1], i + 3);
  if (id) out.usuarios++;
}
for (let i = 0; i < CORRETORES.length; i++) {
  const [email, nome, creci] = CORRETORES[i];
  const id = await upsertUsuario(email, nome, i + 1);
  if (id) {
    out.usuarios++;
    await admin.from("corretores").upsert(
      { usuario_id: id, creci, creci_uf: "MG" }, { onConflict: "usuario_id" });
    out.corretores++;
  }
}

// 3) Imóveis (distribui entre proprietários). Idempotente por (logradouro+numero).
for (let i = 0; i < IMOVEIS.length; i++) {
  const m = IMOVEIS[i];
  const proprietario_id = propIds[i % propIds.length];
  if (!proprietario_id) continue;
  const { data: existe } = await admin
    .from("imoveis").select("id").eq("logradouro", m.log).eq("numero", m.num).maybeSingle();
  if (existe) { out.imoveis++; continue; }
  const { error } = await admin.from("imoveis").insert({
    proprietario_id,
    tipo: m.tipo,
    cep: "38400-000",
    logradouro: m.log, numero: m.num, bairro: m.bairro, cidade: "Uberlândia", uf: "MG",
    area_m2: m.area, quartos: m.q, vagas: m.v,
    valor_anuncio: m.val,
    fotos: m.fotos.map((id) => A(id)),
    status: "ativo",
  });
  if (error) console.log("FALHA imóvel", m.log, error.message);
  else out.imoveis++;
}

console.log("\n=== SEED PRODUÇÃO ===");
console.log(JSON.stringify(out, null, 2));
console.log("Login demo: admin@demo.cade / " + SENHA);
