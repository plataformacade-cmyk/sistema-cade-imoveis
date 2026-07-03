"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type DocumentoState = { error?: string; message?: string };

const STATUS_VALIDOS = ["recebido", "verificado", "reprovado"];

type ChecklistItem = {
  id: string;
  tipo_negocio: "venda" | "locacao" | "ambos";
  perfil: string;
  codigo: string;
  ativo: boolean;
};

type NegocioDocumento = {
  id: string;
  tipo: string | null;
  papeis_negocio?: { papel: string; ativo: boolean; usuario_id: string }[];
};

function aplicaAoTipoNegocio(
  item: ChecklistItem,
  tipoNegocio: string | null,
): boolean {
  const tipo = tipoNegocio ?? "venda";
  return item.tipo_negocio === "ambos" || item.tipo_negocio === tipo;
}

function usuarioPodeRevisar(
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>,
  negocio: NegocioDocumento,
): boolean {
  if (sessao.isAdmin) return true;
  return Boolean(
    negocio.papeis_negocio?.some(
      (p) =>
        p.ativo &&
        p.papel === "corretor" &&
        p.usuario_id === sessao.user.id,
    ),
  );
}

export async function enviarDocumento(
  _prev: DocumentoState,
  formData: FormData,
): Promise<DocumentoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocio_id = String(formData.get("negocio_id") ?? "");
  const checklist_item_id = String(formData.get("checklist_item_id") ?? "");
  const arquivo_url = String(formData.get("arquivo_url") ?? "").trim();
  const vendedor_empresa_id =
    String(formData.get("vendedor_empresa_id") ?? "").trim() || null;

  if (!negocio_id) return { error: "Negocio nao identificado." };
  if (!checklist_item_id) return { error: "Item do checklist nao identificado." };
  if (!arquivo_url) return { error: "Envie o arquivo antes de salvar." };

  const supabase = await createClient();
  const [{ data: negocio, error: negocioError }, { data: item, error: itemError }] =
    await Promise.all([
      supabase
        .from("negocios")
        .select("id, tipo")
        .eq("id", negocio_id)
        .maybeSingle(),
      supabase
        .from("documentos_checklist_itens")
        .select("id, tipo_negocio, perfil, codigo, ativo")
        .eq("id", checklist_item_id)
        .maybeSingle(),
    ]);

  if (negocioError || !negocio)
    return { error: "Nao foi possivel carregar o negocio." };
  if (itemError || !item || !item.ativo)
    return { error: "Item do checklist invalido ou inativo." };
  if (!aplicaAoTipoNegocio(item as ChecklistItem, negocio.tipo))
    return { error: "Este documento nao se aplica ao tipo do negocio." };

  const itemChecklist = item as ChecklistItem;
  const ehCertidaoEmpresa = itemChecklist.codigo.startsWith("empresa_");
  if (ehCertidaoEmpresa && !vendedor_empresa_id)
    return { error: "Selecione o CNPJ da empresa para anexar esta certidao." };
  if (!ehCertidaoEmpresa && vendedor_empresa_id)
    return { error: "CNPJ so pode ser usado em certidoes empresariais." };

  if (vendedor_empresa_id) {
    const { data: vinculo, error: vinculoError } = await supabase
      .from("negocio_vendedor_empresas")
      .select("id")
      .eq("negocio_id", negocio_id)
      .eq("vendedor_empresa_id", vendedor_empresa_id)
      .eq("ativo", true)
      .maybeSingle();

    if (vinculoError || !vinculo)
      return { error: "Empresa nao vinculada a este negocio." };
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      negocio_id,
      checklist_item_id,
      vendedor_empresa_id,
      tipo_doc: itemChecklist.codigo,
      perfil: itemChecklist.perfil,
      arquivo_url,
      enviado_por: sessao.user.id,
      status: "recebido",
    })
    .select("id")
    .single();

  if (error || !data)
    return { error: "Nao foi possivel salvar o documento. Tente novamente." };

  await registrarEvento("documento_enviado", {
    entidadeId: negocio_id,
    payload: {
      documento_id: data.id,
      checklist_item_id,
      tipo_doc: itemChecklist.codigo,
      perfil: itemChecklist.perfil,
      vendedor_empresa_id,
    },
  });

  if (itemChecklist.codigo === "minuta_comprovante_sinal") {
    await registrarEvento("contrato_comprovante_sinal_anexado", {
      entidadeId: negocio_id,
      payload: {
        documento_id: data.id,
        checklist_item_id,
        perfil: itemChecklist.perfil,
      },
    });
  }

  revalidatePath(`/painel/negocios/${negocio_id}/documentos`);
  revalidatePath(`/painel/negocios/${negocio_id}/contrato`);
  revalidatePath(`/painel/negocios/${negocio_id}/cartorial`);
  revalidatePath(`/painel/negocios/${negocio_id}`);
  return { message: "Documento enviado." };
}

export async function mudarStatusDocumento(
  _prev: DocumentoState,
  formData: FormData,
): Promise<DocumentoState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const documento_id = String(formData.get("documento_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const motivoBruto = String(formData.get("motivo_reprovacao") ?? "").trim();

  if (!documento_id) return { error: "Documento nao identificado." };
  if (!STATUS_VALIDOS.includes(status)) return { error: "Status invalido." };
  if (status === "reprovado" && !motivoBruto)
    return { error: "Informe o motivo da reprovacao." };

  const supabase = await createClient();
  const { data: documento, error: documentoError } = await supabase
    .from("documentos")
    .select(
      "id, negocio_id, status, vendedor_empresa_id, negocios(id, tipo, papeis_negocio(papel, ativo, usuario_id))",
    )
    .eq("id", documento_id)
    .maybeSingle();

  if (documentoError || !documento)
    return { error: "Nao foi possivel carregar o documento." };

  const negocio = Array.isArray(documento.negocios)
    ? documento.negocios[0]
    : documento.negocios;

  if (!negocio || !usuarioPodeRevisar(sessao, negocio as NegocioDocumento))
    return { error: "Voce nao tem permissao para revisar este documento." };

  const { data, error } = await supabase
    .from("documentos")
    .update({
      status,
      motivo_reprovacao: status === "reprovado" ? motivoBruto : null,
      revisado_por: sessao.user.id,
      revisado_em: new Date().toISOString(),
    })
    .eq("id", documento_id)
    .select("negocio_id, status")
    .single();

  if (error || !data)
    return {
      error: "Nao foi possivel mudar o status do documento. Tente novamente.",
    };

  await registrarEvento("documento_status_mudado", {
    entidadeId: documento_id,
    payload: {
      status,
      negocio_id: data.negocio_id,
      vendedor_empresa_id: documento.vendedor_empresa_id,
      motivo_reprovacao: status === "reprovado" ? motivoBruto : undefined,
    },
  });

  revalidatePath(`/painel/negocios/${data.negocio_id}/documentos`);
  revalidatePath(`/painel/negocios/${data.negocio_id}/contrato`);
  revalidatePath(`/painel/negocios/${data.negocio_id}/cartorial`);
  revalidatePath(`/painel/negocios/${data.negocio_id}`);
  return { message: "Status do documento atualizado." };
}
