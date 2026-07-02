"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { registrarEvento } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type EmpresaVendedorState = { error?: string; message?: string };

type PapelNegocio = {
  papel: string;
  ativo: boolean;
  usuario_id: string;
};

type NegocioComPapeis = {
  id: string;
  papeis_negocio?: PapelNegocio[];
};

function normalizarCnpj(valor: string): string {
  return valor.replace(/\D/g, "");
}

function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcular = (base: string, pesos: number[]) => {
    const soma = pesos.reduce(
      (total, peso, index) => total + Number(base[index]) * peso,
      0,
    );
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcular(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcular(cnpj.slice(0, 13), [
    6,
    5,
    4,
    3,
    2,
    9,
    8,
    7,
    6,
    5,
    4,
    3,
    2,
  ]);

  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function usuarioPodeGerirVendedor(
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>,
  negocio: NegocioComPapeis,
  vendedorId: string,
): boolean {
  if (sessao.isAdmin) return true;
  const papeis = negocio.papeis_negocio ?? [];
  const vendedorAtivo = papeis.some(
    (p) => p.ativo && p.usuario_id === vendedorId && p.papel === "proprietario",
  );
  if (!vendedorAtivo) return false;
  if (vendedorId === sessao.user.id) return true;
  return papeis.some(
    (p) =>
      p.ativo &&
      p.usuario_id === sessao.user.id &&
      p.papel === "corretor",
  );
}

async function carregarNegocio(negocioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("negocios")
    .select("id, papeis_negocio(papel, ativo, usuario_id)")
    .eq("id", negocioId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as NegocioComPapeis;
}

function revalidarDocumentos(negocioId: string) {
  revalidatePath(`/painel/negocios/${negocioId}/documentos`);
  revalidatePath(`/painel/negocios/${negocioId}`);
}

export async function salvarDeclaracaoEmpresaVendedor(
  _prev: EmpresaVendedorState,
  formData: FormData,
): Promise<EmpresaVendedorState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "");
  const vendedorId = String(formData.get("vendedor_id") ?? "");
  const possuiEmpresa = String(formData.get("possui_empresa") ?? "") === "true";

  if (!negocioId || !vendedorId)
    return { error: "Negocio ou vendedor nao identificado." };

  const negocio = await carregarNegocio(negocioId);
  if (!negocio || !usuarioPodeGerirVendedor(sessao, negocio, vendedorId))
    return { error: "Voce nao tem permissao para atualizar esta declaracao." };

  const supabase = await createClient();
  const { error } = await supabase.from("negocio_vendedor_declaracoes").upsert(
    {
      negocio_id: negocioId,
      vendedor_id: vendedorId,
      possui_empresa: possuiEmpresa,
      declarado_por: sessao.user.id,
    },
    { onConflict: "negocio_id,vendedor_id" },
  );

  if (error)
    return { error: "Nao foi possivel salvar a declaracao do vendedor." };

  if (!possuiEmpresa) {
    await supabase
      .from("negocio_vendedor_empresas")
      .update({ ativo: false })
      .eq("negocio_id", negocioId)
      .eq("vendedor_id", vendedorId);
  }

  await registrarEvento("vendedor_empresa_declarada", {
    entidadeId: negocioId,
    payload: {
      vendedor_id: vendedorId,
      possui_empresa: possuiEmpresa,
    },
  });

  revalidarDocumentos(negocioId);
  return { message: "Declaracao atualizada." };
}

export async function cadastrarVincularEmpresaVendedor(
  _prev: EmpresaVendedorState,
  formData: FormData,
): Promise<EmpresaVendedorState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "");
  const vendedorId = String(formData.get("vendedor_id") ?? "");
  const cnpj = normalizarCnpj(String(formData.get("cnpj") ?? ""));
  const razaoSocial = String(formData.get("razao_social") ?? "").trim();
  const nomeFantasia = String(formData.get("nome_fantasia") ?? "").trim();

  if (!negocioId || !vendedorId)
    return { error: "Negocio ou vendedor nao identificado." };
  if (!cnpjValido(cnpj)) return { error: "Informe um CNPJ valido." };

  const negocio = await carregarNegocio(negocioId);
  if (!negocio || !usuarioPodeGerirVendedor(sessao, negocio, vendedorId))
    return { error: "Voce nao tem permissao para vincular empresa." };

  const supabase = await createClient();
  const { data: empresa, error: empresaError } = await supabase
    .from("vendedor_empresas")
    .upsert(
      {
        usuario_id: vendedorId,
        cnpj,
        razao_social: razaoSocial || null,
        nome_fantasia: nomeFantasia || null,
      },
      { onConflict: "usuario_id,cnpj" },
    )
    .select("id")
    .single();

  if (empresaError || !empresa)
    return { error: "Nao foi possivel cadastrar o CNPJ do vendedor." };

  const { error: vinculoError } = await supabase
    .from("negocio_vendedor_empresas")
    .upsert(
      {
        negocio_id: negocioId,
        vendedor_id: vendedorId,
        vendedor_empresa_id: empresa.id,
        ativo: true,
        criado_por: sessao.user.id,
      },
      { onConflict: "negocio_id,vendedor_empresa_id" },
    );

  if (vinculoError)
    return { error: "Nao foi possivel vincular a empresa ao negocio." };

  await supabase.from("negocio_vendedor_declaracoes").upsert(
    {
      negocio_id: negocioId,
      vendedor_id: vendedorId,
      possui_empresa: true,
      declarado_por: sessao.user.id,
    },
    { onConflict: "negocio_id,vendedor_id" },
  );

  await registrarEvento("vendedor_empresa_vinculada", {
    entidadeId: negocioId,
    payload: {
      vendedor_id: vendedorId,
      vendedor_empresa_id: empresa.id,
    },
  });

  revalidarDocumentos(negocioId);
  return { message: "Empresa vinculada ao negocio." };
}

export async function desvincularEmpresaVendedor(
  _prev: EmpresaVendedorState,
  formData: FormData,
): Promise<EmpresaVendedorState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const negocioId = String(formData.get("negocio_id") ?? "");
  const vendedorId = String(formData.get("vendedor_id") ?? "");
  const vinculoId = String(formData.get("vinculo_id") ?? "");

  if (!negocioId || !vendedorId || !vinculoId)
    return { error: "Vinculo de empresa nao identificado." };

  const negocio = await carregarNegocio(negocioId);
  if (!negocio || !usuarioPodeGerirVendedor(sessao, negocio, vendedorId))
    return { error: "Voce nao tem permissao para desvincular empresa." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("negocio_vendedor_empresas")
    .update({ ativo: false })
    .eq("id", vinculoId)
    .eq("negocio_id", negocioId)
    .eq("vendedor_id", vendedorId);

  if (error)
    return { error: "Nao foi possivel desvincular a empresa do negocio." };

  await registrarEvento("vendedor_empresa_desvinculada", {
    entidadeId: negocioId,
    payload: {
      vendedor_id: vendedorId,
      vinculo_id: vinculoId,
    },
  });

  revalidarDocumentos(negocioId);
  return { message: "Empresa desvinculada do negocio." };
}
