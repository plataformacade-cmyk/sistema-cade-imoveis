// Smoke E2E ampliado da camada de dados contra o Supabase LOCAL.
// Cobre: auth, trigger, vitrine, interesse, chat, proposta, visita,
// documentos por checklist, comissao e contrato sob RLS.
// Rodar: ANON=.. SROLE=.. node scripts/smoke-fluxos.mjs
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const admin = createClient(URL, process.env.SROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let ok = 0;
let fail = 0;
const check = (nome, condicao, erro = "") => {
  console.log((condicao ? "PASS" : "FAIL") + ":", nome, condicao ? "" : ":: " + erro);
  if (condicao) ok++;
  else fail++;
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

const propId = await mk("prop@teste.local", "Proprietario");
const compId = await mk("comp@teste.local", "Comprador");
const corrId = await mk("corr@teste.local", "Corretor");
const foraId = await mk("fora@teste.local", "Fora");
check("auth + trigger (4 usuarios)", propId && compId && corrId && foraId);

const { data: imovel } = await admin
  .from("imoveis")
  .insert({
    proprietario_id: propId,
    tipo: "apartamento",
    cidade: "Uberlandia",
    bairro: "Centro",
    valor_anuncio: 350000,
    status: "ativo",
  })
  .select("id")
  .single();
check("imovel ativo criado", !!imovel?.id);

const anon = createClient(URL, process.env.ANON);
const { data: vit } = await anon.from("imoveis").select("id").eq("status", "ativo");
check("vitrine publica (anon)", (vit?.length ?? 0) >= 1, `rows=${vit?.length}`);

const comp = createClient(URL, process.env.ANON);
await comp.auth.signInWithPassword({ email: "comp@teste.local", password: senha });
const prop = createClient(URL, process.env.ANON);
await prop.auth.signInWithPassword({ email: "prop@teste.local", password: senha });
const corr = createClient(URL, process.env.ANON);
await corr.auth.signInWithPassword({ email: "corr@teste.local", password: senha });
const fora = createClient(URL, process.env.ANON);
await fora.auth.signInWithPassword({ email: "fora@teste.local", password: senha });

const { data: negId, error: eInt } = await comp.rpc("demonstrar_interesse", {
  p_imovel_id: imovel.id,
});
check("RPC interesse", !eInt && negId, eInt?.message);

await admin.from("papeis_negocio").insert({
  negocio_id: negId,
  usuario_id: corrId,
  papel: "corretor",
  ativo: true,
});

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
  condicoes: "A vista",
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

const { error: eVisRealizada } = await prop
  .from("visitas")
  .update({ status: "realizada" })
  .eq("id", visita?.id);
check("anunciante: marcar visita realizada", !eVisRealizada, eVisRealizada?.message);

const { data: negProposta } = await admin
  .from("negocios")
  .select("status")
  .eq("id", negId)
  .single();
check(
  "visita realizada move negocio para proposta",
  negProposta?.status === "proposta",
  `status=${negProposta?.status}`,
);

const { data: negPerdido } = await admin
  .from("negocios")
  .insert({ imovel_id: imovel.id, status: "perdido", criado_por: compId })
  .select("id")
  .single();
await admin.from("papeis_negocio").insert([
  { negocio_id: negPerdido.id, usuario_id: compId, papel: "comprador", ativo: true },
  { negocio_id: negPerdido.id, usuario_id: propId, papel: "proprietario", ativo: true },
]);
const { data: visitaPerdida } = await admin
  .from("visitas")
  .insert({
    imovel_id: imovel.id,
    negocio_id: negPerdido.id,
    solicitante_id: propId,
    data_hora: new Date(Date.now() + 172800000).toISOString(),
    canal: "presencial",
    status: "confirmada",
  })
  .select("id")
  .single();
const { error: eVisPerdida } = await prop
  .from("visitas")
  .update({ status: "realizada" })
  .eq("id", visitaPerdida?.id);
const { data: negPerdidoDepois } = await admin
  .from("negocios")
  .select("status")
  .eq("id", negPerdido.id)
  .single();
check(
  "visita realizada nao reabre negocio perdido",
  !eVisPerdida && negPerdidoDepois?.status === "perdido",
  eVisPerdida?.message ?? `status=${negPerdidoDepois?.status}`,
);

const { data: checklistDoc, error: eChecklistDoc } = await comp
  .from("documentos_checklist_itens")
  .select("id, codigo")
  .eq("tipo_negocio", "venda")
  .eq("perfil", "comprador")
  .eq("codigo", "comprador_rg_cpf")
  .eq("ativo", true)
  .single();
check(
  "checklist documentos: item venda comprador",
  !eChecklistDoc && checklistDoc?.id,
  eChecklistDoc?.message,
);

const { data: docCriado, error: eDoc } = await comp
  .from("documentos")
  .insert({
    negocio_id: negId,
    checklist_item_id: checklistDoc?.id,
    tipo_doc: "sera_derivado",
    arquivo_url: `${compId}/rg.pdf`,
    enviado_por: compId,
    status: "recebido",
  })
  .select("id, tipo_doc, perfil, status")
  .single();
check(
  "participante: enviar documento por checklist",
  !eDoc && docCriado?.tipo_doc === "comprador_rg_cpf" && docCriado?.perfil === "comprador",
  eDoc?.message ?? JSON.stringify(docCriado),
);

const { data: docsComp, error: eDocLe } = await comp
  .from("documentos")
  .select("id")
  .eq("negocio_id", negId);
check("participante: ler documentos", !eDocLe && (docsComp?.length ?? 0) >= 1, eDocLe?.message);

const { data: docsFora, error: eDocForaLe } = await fora
  .from("documentos")
  .select("id")
  .eq("negocio_id", negId);
check(
  "usuario externo: nao le documentos",
  !eDocForaLe && (docsFora?.length ?? 0) === 0,
  eDocForaLe?.message ?? `rows=${docsFora?.length}`,
);

const { error: eDocForaIns } = await fora.from("documentos").insert({
  negocio_id: negId,
  checklist_item_id: checklistDoc?.id,
  tipo_doc: "comprador_rg_cpf",
  arquivo_url: `${foraId}/rg.pdf`,
  enviado_por: foraId,
  status: "recebido",
});
check("usuario externo: nao envia documento", !!eDocForaIns, "insert externo nao bloqueado");

const { error: eDocCompRev } = await comp
  .from("documentos")
  .update({ status: "verificado" })
  .eq("id", docCriado?.id)
  .select("id");
const { data: docAposCompRev } = await admin
  .from("documentos")
  .select("status")
  .eq("id", docCriado?.id)
  .single();
check(
  "comprador: nao revisa documento",
  (eDocCompRev || docAposCompRev?.status === "recebido"),
  "comprador conseguiu revisar",
);

const { data: docRevisado, error: eDocCorrRev } = await corr
  .from("documentos")
  .update({
    status: "reprovado",
    motivo_reprovacao: "Documento ilegivel no smoke",
  })
  .eq("id", docCriado?.id)
  .select("status, motivo_reprovacao, revisado_por")
  .single();
check(
  "corretor: reprova documento com motivo",
  !eDocCorrRev && docRevisado?.status === "reprovado" && docRevisado?.revisado_por === corrId,
  eDocCorrRev?.message ?? JSON.stringify(docRevisado),
);

const { error: eDeclSemEmpresa } = await prop
  .from("negocio_vendedor_declaracoes")
  .upsert(
    {
      negocio_id: negId,
      vendedor_id: propId,
      possui_empresa: false,
      declarado_por: propId,
    },
    { onConflict: "negocio_id,vendedor_id" },
  );
check("vendedor: declara sem empresa", !eDeclSemEmpresa, eDeclSemEmpresa?.message);

const { error: eCnpjInvalido } = await prop.from("vendedor_empresas").insert({
  usuario_id: propId,
  cnpj: "00000000000000",
});
check("vendedor: CNPJ invalido rejeitado", !!eCnpjInvalido, "CNPJ invalido aceito");

const { data: empresa1, error: eEmpresa1 } = await prop
  .from("vendedor_empresas")
  .insert({
    usuario_id: propId,
    cnpj: "04252011000110",
    razao_social: "Empresa Smoke Um LTDA",
  })
  .select("id, cnpj")
  .single();
check("vendedor: cadastra CNPJ valido", !eEmpresa1 && empresa1?.id, eEmpresa1?.message);

const { data: empresa2, error: eEmpresa2 } = await prop
  .from("vendedor_empresas")
  .insert({
    usuario_id: propId,
    cnpj: "11222333000181",
    razao_social: "Empresa Smoke Dois LTDA",
  })
  .select("id")
  .single();
check("vendedor: cadastra multiplos CNPJs", !eEmpresa2 && empresa2?.id, eEmpresa2?.message);

const { error: eVinculoEmpresa } = await prop.from("negocio_vendedor_empresas").insert([
  {
    negocio_id: negId,
    vendedor_id: propId,
    vendedor_empresa_id: empresa1?.id,
    criado_por: propId,
  },
  {
    negocio_id: negId,
    vendedor_id: propId,
    vendedor_empresa_id: empresa2?.id,
    criado_por: propId,
  },
]);
check("vendedor: vincula empresas ao negocio", !eVinculoEmpresa, eVinculoEmpresa?.message);

await prop.from("negocio_vendedor_declaracoes").upsert(
  {
    negocio_id: negId,
    vendedor_id: propId,
    possui_empresa: true,
    declarado_por: propId,
  },
  { onConflict: "negocio_id,vendedor_id" },
);

const { data: checklistEmpresa, error: eChecklistEmpresa } = await prop
  .from("documentos_checklist_itens")
  .select("id, codigo")
  .eq("tipo_negocio", "venda")
  .eq("perfil", "vendedor")
  .eq("codigo", "empresa_cnd_federal_divida_ativa")
  .eq("ativo", true)
  .single();
check(
  "checklist documentos: certidao empresarial",
  !eChecklistEmpresa && checklistEmpresa?.id,
  eChecklistEmpresa?.message,
);

const { error: eDocEmpresaSemCnpj } = await prop.from("documentos").insert({
  negocio_id: negId,
  checklist_item_id: checklistEmpresa?.id,
  tipo_doc: "empresa_cnd_federal_divida_ativa",
  arquivo_url: `${propId}/empresa-sem-cnpj.pdf`,
  enviado_por: propId,
  status: "recebido",
});
check(
  "certidao empresarial exige CNPJ vinculado",
  !!eDocEmpresaSemCnpj,
  "certidao sem vendedor_empresa_id foi aceita",
);

const { data: docEmpresa, error: eDocEmpresa } = await prop
  .from("documentos")
  .insert({
    negocio_id: negId,
    checklist_item_id: checklistEmpresa?.id,
    vendedor_empresa_id: empresa1?.id,
    tipo_doc: "sera_derivado",
    arquivo_url: `${propId}/empresa-cnd.pdf`,
    enviado_por: propId,
    status: "recebido",
  })
  .select("id, tipo_doc, perfil, vendedor_empresa_id")
  .single();
check(
  "vendedor: anexa certidao por CNPJ",
  !eDocEmpresa &&
    docEmpresa?.tipo_doc === "empresa_cnd_federal_divida_ativa" &&
    docEmpresa?.vendedor_empresa_id === empresa1?.id,
  eDocEmpresa?.message ?? JSON.stringify(docEmpresa),
);

const { data: empresasFora, error: eEmpresaForaLe } = await fora
  .from("vendedor_empresas")
  .select("id")
  .eq("id", empresa1?.id);
check(
  "usuario externo: nao le empresa do vendedor",
  !eEmpresaForaLe && (empresasFora?.length ?? 0) === 0,
  eEmpresaForaLe?.message ?? `rows=${empresasFora?.length}`,
);

const { error: eDocEmpresaFora } = await fora.from("documentos").insert({
  negocio_id: negId,
  checklist_item_id: checklistEmpresa?.id,
  vendedor_empresa_id: empresa1?.id,
  tipo_doc: "empresa_cnd_federal_divida_ativa",
  arquivo_url: `${foraId}/empresa-cnd.pdf`,
  enviado_por: foraId,
  status: "recebido",
});
check("usuario externo: nao anexa certidao empresarial", !!eDocEmpresaFora, "insert externo nao bloqueado");

const { data: docEmpresaVerificado, error: eDocEmpresaCorrRev } = await corr
  .from("documentos")
  .update({ status: "verificado" })
  .eq("id", docEmpresa?.id)
  .select("status, revisado_por")
  .single();
check(
  "corretor: verifica certidao empresarial",
  !eDocEmpresaCorrRev &&
    docEmpresaVerificado?.status === "verificado" &&
    docEmpresaVerificado?.revisado_por === corrId,
  eDocEmpresaCorrRev?.message ?? JSON.stringify(docEmpresaVerificado),
);

const { error: eCom } = await comp.from("comissoes").insert({
  negocio_id: negId,
  percentual: 6,
  base_calculo: 340000,
  valor: 20400,
  pagador: "proprietario",
});
check("participante: registrar comissao", !eCom, eCom?.message);

const { error: eCon } = await comp
  .from("contratos")
  .insert({ negocio_id: negId, tipo: "venda", status: "gerado" });
check("participante: gerar contrato", !eCon, eCon?.message);

console.log(`\n=== RESULTADO: ${ok} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
