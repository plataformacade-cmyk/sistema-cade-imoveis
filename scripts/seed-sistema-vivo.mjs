// Cria usuários por PAPEL + relacionamentos reais ("sistema vivo") p/ demo.
// Idempotente: roda quantas vezes quiser. Uso:
//   SUPA_URL=.. SROLE=.. node scripts/seed-sistema-vivo.mjs
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPA_URL, process.env.SROLE, { auth: { persistSession: false } });
const SENHA = "CadeDemo!2026";

const USUARIOS = [
  { email: "admin@demo.cade", nome: "Equipe Cadê", papel: "admin" },
  { email: "proprietario@demo.cade", nome: "Paulo Proprietário", papel: "proprietario" },
  { email: "corretor@demo.cade", nome: "Carla Corretora", papel: "corretor" },
  { email: "cliente@demo.cade", nome: "Amanda Cliente", papel: "cliente" },
];

async function acharUsuario(email) {
  // listUsers pagina; com poucos usuários, varre algumas páginas.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

async function upsertUsuario({ email, nome, papel }) {
  let u = await acharUsuario(email);
  if (!u) {
    const { data, error } = await sb.auth.admin.createUser({
      email, password: SENHA, email_confirm: true, user_metadata: { nome, papel },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    u = data.user;
    console.log("criado:", email);
  } else {
    await sb.auth.admin.updateUserById(u.id, { password: SENHA, user_metadata: { nome, papel } });
    console.log("já existia:", email);
  }
  // garante linha em usuarios com papel certo (o trigger cria; reforço aqui)
  await sb.from("usuarios").update({ nome, papel }).eq("id", u.id);
  return u.id;
}

async function existeColuna() {
  const { error } = await sb.from("usuarios").select("papel").limit(1);
  if (error) throw new Error("coluna 'papel' não existe — rode a migration antes: " + error.message);
}

async function main() {
  await existeColuna();
  const id = {};
  for (const u of USUARIOS) id[u.papel] = await upsertUsuario(u);

  // admin → tabela admins (is_admin)
  await sb.from("admins").upsert({ usuario_id: id.admin }, { onConflict: "usuario_id" });

  // corretor → tabela corretores (CRECI)
  await sb.from("corretores").upsert(
    { usuario_id: id.corretor, creci: "MG-12345", creci_uf: "MG" },
    { onConflict: "usuario_id" },
  );

  // Distribui imóveis: metade pro proprietário, alguns pro corretor.
  const { data: imoveis } = await sb
    .from("imoveis").select("id, valor_anuncio, bairro").eq("status", "ativo")
    .order("criado_em", { ascending: true });
  const lista = imoveis ?? [];
  for (let i = 0; i < lista.length; i++) {
    const dono = i % 3 === 2 ? id.corretor : id.proprietario; // ~1/3 corretor
    await sb.from("imoveis").update({ proprietario_id: dono }).eq("id", lista[i].id);
  }
  console.log(`imóveis distribuídos: ${lista.length} (proprietário + corretor)`);

  // ── Negócio vivo: cliente interessado num imóvel do proprietário ──
  const imA = lista[0];
  if (imA) {
    let { data: negExist } = await sb
      .from("negocios").select("id").eq("imovel_id", imA.id).limit(1);
    let negId = negExist?.[0]?.id;
    if (!negId) {
      const { data: neg, error } = await sb.from("negocios")
        .insert({ imovel_id: imA.id, status: "em_negociacao", criado_por: id.cliente })
        .select("id").single();
      if (error) throw new Error("negocio: " + error.message);
      negId = neg.id;
      console.log("negócio criado:", negId);
    }
    // papéis
    await sb.from("papeis_negocio").upsert([
      { negocio_id: negId, usuario_id: id.proprietario, papel: "proprietario" },
      { negocio_id: negId, usuario_id: id.cliente, papel: "comprador" },
    ], { onConflict: "negocio_id,usuario_id,papel" });

    // conversa + mensagens
    let { data: convExist } = await sb.from("conversas").select("id").eq("negocio_id", negId).limit(1);
    let convId = convExist?.[0]?.id;
    if (!convId) {
      const { data: conv, error } = await sb.from("conversas").insert({ negocio_id: negId }).select("id").single();
      if (error) throw new Error("conversa: " + error.message);
      convId = conv.id;
    }
    const { count } = await sb.from("mensagens").select("id", { count: "exact", head: true }).eq("conversa_id", convId);
    if (!count) {
      await sb.from("mensagens").insert([
        { conversa_id: convId, autor_id: id.cliente, corpo: `Oi! Tenho interesse no imóvel em ${imA.bairro ?? "Uberlândia"}. Ainda está disponível?` },
        { conversa_id: convId, autor_id: id.proprietario, corpo: "Olá, Amanda! Está sim. Aceita marcar uma visita essa semana?" },
        { conversa_id: convId, autor_id: id.cliente, corpo: "Aceito! Pode ser quinta à tarde?" },
        { conversa_id: convId, autor_id: id.proprietario, corpo: "Perfeito, deixei a visita agendada. Qualquer dúvida estou por aqui." },
      ]);
      console.log("conversa + 4 mensagens criadas");
    }

    // visita
    const { count: cv } = await sb.from("visitas").select("id", { count: "exact", head: true }).eq("negocio_id", negId);
    if (!cv) {
      await sb.from("visitas").insert({
        imovel_id: imA.id, negocio_id: negId, solicitante_id: id.cliente,
        data_hora: "2026-06-19T15:00:00-03:00", status: "confirmada", canal: "presencial",
        observacoes: "Visita combinada pelo chat.",
      });
      console.log("visita confirmada criada");
    }

    // proposta
    const { count: cp } = await sb.from("propostas").select("id", { count: "exact", head: true }).eq("negocio_id", negId);
    if (!cp && imA.valor_anuncio) {
      await sb.from("propostas").insert({
        negocio_id: negId, autor_id: id.cliente,
        valor: Math.round(Number(imA.valor_anuncio) * 0.95), condicoes: "Pagamento via financiamento, entrada de 20%.",
        status: "enviada",
      });
      console.log("proposta enviada criada");
    }
  }

  console.log("\nPRONTO. Logins demo (senha " + SENHA + "):");
  USUARIOS.forEach((u) => console.log(`  ${u.papel.padEnd(12)} ${u.email}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
