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
        .insert({ imovel_id: imA.id, status: "visita", criado_por: id.cliente })
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

  // ── Suporte vivo: conversas com o assistente + uma escalada p/ humano ──
  await seedSuporte(id);

  console.log("\nPRONTO. Logins demo (senha " + SENHA + "):");
  USUARIOS.forEach((u) => console.log(`  ${u.papel.padEnd(12)} ${u.email}`));
}

// Cria conversas de suporte demonstrando o agente em ação (idempotente).
async function seedSuporte(id) {
  // A migration de suporte precisa estar aplicada.
  const { error: e0 } = await sb.from("suporte_conversas").select("id").limit(1);
  if (e0) { console.log("suporte: tabelas ainda não existem (rode a migration) — pulando."); return; }

  async function conversa({ usuario, papel, assunto, status, atendente, mensagens }) {
    const { data: ja } = await sb
      .from("suporte_conversas").select("id").eq("usuario_id", usuario).eq("assunto", assunto).limit(1);
    if (ja?.[0]?.id) return ja[0].id;
    const { data: conv, error } = await sb.from("suporte_conversas")
      .insert({ usuario_id: usuario, papel, assunto, status, atendente_id: atendente ?? null })
      .select("id").single();
    if (error) throw new Error("suporte_conversa: " + error.message);
    for (const m of mensagens) {
      await sb.from("suporte_mensagens").insert({
        conversa_id: conv.id, autor: m.autor, autor_id: m.autor_id ?? null, corpo: m.corpo,
      });
    }
    return conv.id;
  }

  // 1) Cliente tirou dúvida e o assistente resolveu na hora.
  await conversa({
    usuario: id.cliente, papel: "cliente",
    assunto: "Como agendo uma visita?", status: "resolvida",
    mensagens: [
      { autor: "usuario", autor_id: id.cliente, corpo: "Oi! Como faço pra agendar uma visita num imóvel?" },
      { autor: "assistente", corpo: "Depois de demonstrar interesse, dentro da negociação você pede uma visita escolhendo data e horário. O anunciante confirma e você acompanha o status na aba Visitas do seu painel." },
      { autor: "usuario", autor_id: id.cliente, corpo: "Perfeito, obrigada!" },
      { autor: "assistente", corpo: "Disponha! Qualquer dúvida é só chamar por aqui. 😊" },
    ],
  });

  // 2) Proprietário com caso específico → escalou para um atendente humano.
  await conversa({
    usuario: id.proprietario, papel: "proprietario",
    assunto: "Minha foto não está subindo", status: "aguardando_humano",
    atendente: id.admin,
    mensagens: [
      { autor: "usuario", autor_id: id.proprietario, corpo: "Estou tentando adicionar fotos no meu anúncio e dá erro. Pode ajudar?" },
      { autor: "assistente", corpo: "Isso parece um caso específico da sua conta. Vou chamar um atendente humano da Cadê para te ajudar com isso." },
      { autor: "humano", autor_id: id.admin, corpo: "Oi, Paulo! Aqui é a equipe da Cadê. Qual o tamanho do arquivo e o formato da foto? Aceitamos JPG/PNG/WebP até 10 MB." },
    ],
  });

  console.log("suporte: 2 conversas criadas (1 resolvida + 1 com atendente).");
}

main().catch((e) => { console.error(e); process.exit(1); });
