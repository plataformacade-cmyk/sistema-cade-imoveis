// Smoke E2E ampliado da camada de dados contra o Supabase LOCAL.
// Cobre: auth, trigger, vitrine (RLS), interesse (RPC), e os fluxos de
// participante (mensagem/proposta/visita/documento/comissão/contrato) sob RLS.
// Rodar: ANON=.. SROLE=.. node scripts/smoke-fluxos.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const admin = createClient(URL, process.env.SROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let ok = 0,
  fail = 0;
const check = (n, c, e = "") => {
  console.log((c ? "PASS" : "FAIL") + ":", n, c ? "" : ":: " + e);
  if (c) {
    ok++;
  } else {
    fail++;
  }
};

const senha = "senha-teste-123";
const mk = async (email, nome) =>
  (
    await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    })
  ).data?.user?.id;

const propId = await mk("prop@teste.local", "Proprietário");
const compId = await mk("comp@teste.local", "Comprador");
check("auth + trigger (2 usuários)", propId && compId);

const { data: imovel } = await admin
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
check("imóvel ativo criado", !!imovel?.id);

const anon = createClient(URL, process.env.ANON);
const { data: vit } = await anon.from("imoveis").select("id").eq("status", "ativo");
check("vitrine pública (anon)", (vit?.length ?? 0) >= 1, `rows=${vit?.length}`);

const comp = createClient(URL, process.env.ANON);
await comp.auth.signInWithPassword({ email: "comp@teste.local", password: senha });
const prop = createClient(URL, process.env.ANON);
await prop.auth.signInWithPassword({ email: "prop@teste.local", password: senha });
const { data: negId, error: eInt } = await comp.rpc("demonstrar_interesse", {
  p_imovel_id: imovel.id,
});
check("RPC interesse", !eInt && negId, eInt?.message);

const { data: negCriado } = await admin
  .from("negocios")
  .select("status")
  .eq("id", negId)
  .single();
check(
  "RPC interesse cria negocio em qualificacao",
  negCriado?.status === "qualificacao",
  `status=${negCriado?.status}`,
);

const { data: conv } = await admin
  .from("conversas")
  .select("id")
  .eq("negocio_id", negId)
  .single();

// Fluxos de participante (comprador) sob RLS:
const { error: eMsg } = await comp
  .from("mensagens")
  .insert({ conversa_id: conv.id, autor_id: compId, corpo: "Tenho interesse!" });
check("participante: enviar mensagem", !eMsg, eMsg?.message);

const { data: msgs, error: eMsgLe } = await comp
  .from("mensagens")
  .select("id")
  .eq("conversa_id", conv.id);
check("participante: ler mensagens", !eMsgLe && (msgs?.length ?? 0) >= 1, eMsgLe?.message);

const { error: eProp } = await comp.from("propostas").insert({
  negocio_id: negId,
  autor_id: compId,
  valor: 340000,
  condicoes: "À vista",
  status: "enviada",
});
check("participante: enviar proposta", !eProp, eProp?.message);

const { data: props, error: ePropLe } = await comp
  .from("propostas")
  .select("id")
  .eq("negocio_id", negId);
check("participante: ler propostas", !ePropLe && (props?.length ?? 0) >= 1, ePropLe?.message);

const { data: visita, error: eVis } = await prop
  .from("visitas")
  .insert({
    imovel_id: imovel.id,
    negocio_id: negId,
    solicitante_id: propId,
    data_hora: new Date(Date.now() + 86400000).toISOString(),
    canal: "presencial",
    status: "aguardando_confirmacao",
  })
  .select("id")
  .single();
check("anunciante: sugerir visita", !eVis && visita?.id, eVis?.message);

const { error: eMsgVisita } = await prop.from("mensagens").insert({
  conversa_id: conv.id,
  autor_id: propId,
  corpo: "Visita sugerida pelo chat.",
  tipo: "visita_sugerida",
  metadata: { visita_id: visita?.id },
});
check("anunciante: registrar visita no chat", !eMsgVisita, eMsgVisita?.message);

const { data: visitasComp, error: eVisLe } = await comp
  .from("visitas")
  .select("id, status")
  .eq("negocio_id", negId);
check(
  "comprador: ler visita do negocio",
  !eVisLe && (visitasComp?.length ?? 0) >= 1,
  eVisLe?.message,
);

const { error: eVisConf } = await comp
  .from("visitas")
  .update({ status: "confirmada" })
  .eq("id", visita?.id);
check("comprador: confirmar visita", !eVisConf, eVisConf?.message);

const { error: eDoc } = await comp.from("documentos").insert({
  negocio_id: negId,
  tipo_doc: "rg",
  arquivo_url: `${compId}/rg.pdf`,
  enviado_por: compId,
  status: "recebido",
});
check("participante: enviar documento", !eDoc, eDoc?.message);

const { error: eCom } = await comp.from("comissoes").insert({
  negocio_id: negId,
  percentual: 6,
  base_calculo: 340000,
  valor: 20400,
  pagador: "proprietario",
});
check("participante: registrar comissão", !eCom, eCom?.message);

const { error: eCon } = await comp
  .from("contratos")
  .insert({ negocio_id: negId, tipo: "venda", status: "gerado" });
check("participante: gerar contrato", !eCon, eCon?.message);

console.log(`\n=== RESULTADO: ${ok} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
