"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { criarDestinoAceiteTermos, criarDestinoTelefone } from "@/lib/auth-redirect";
import { registrarEvento } from "@/lib/log";
import { PACOTE_NAO_CONTRATAR } from "@/lib/servicos-juridicos";
import { isTipoNegocio, TIPO_NEGOCIO_PADRAO } from "@/lib/negocios/tipo";
import {
  cancelarContratacaoServicoJuridicoImovel,
  registrarContratacaoServicoJuridico,
} from "@/lib/servicos-juridicos-server";
import { usuarioTemTermosPendentes, type PerfilTermo } from "@/lib/termos";
import { usuarioTemTelefoneObrigatorio } from "@/lib/telefone";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ImovelState = {
  error?: string;
  ok?: boolean;
  id?: string;
  warning?: string;
};

const TIPOS = ["casa", "apartamento", "comercial", "terreno"] as const;
const STATUSES = [
  "rascunho",
  "ativo",
  "em_negociacao",
  "vendido",
  "arquivado",
] as const;

type Tipo = (typeof TIPOS)[number];
type Status = (typeof STATUSES)[number];
type SessaoImoveis = NonNullable<Awaited<ReturnType<typeof getSessao>>>;
type EnderecoDerivado = {
  cep: string;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  origem: "viacep" | "manual_admin";
};

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function int(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function normalizarCep(v: FormDataEntryValue | null): string | null {
  const cep = String(v ?? "").replace(/\D/g, "");
  return cep.length === 8 ? cep : null;
}

function textoEndereco(v: string | null): string | null {
  if (!v) return null;
  const limpo = v.replace(/\s+/g, " ").trim();
  return limpo || null;
}

function ufEndereco(v: string | null): string | null {
  const uf = textoEndereco(v)?.toUpperCase() ?? null;
  return uf && /^[A-Z]{2}$/.test(uf) ? uf : null;
}

async function buscarEnderecoPorCep(cep: string): Promise<EnderecoDerivado | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    const bairro = textoEndereco(data.bairro ?? null);
    const cidade = textoEndereco(data.localidade ?? null);
    const uf = ufEndereco(data.uf ?? null);
    if (!bairro || !cidade || !uf) return null;
    return {
      cep,
      logradouro: textoEndereco(data.logradouro ?? null),
      bairro,
      cidade,
      uf,
      origem: "viacep",
    };
  } catch {
    return null;
  }
}

async function resolverEndereco(
  formData: FormData,
  sessao: SessaoImoveis,
): Promise<{ erro: string } | { endereco: EnderecoDerivado }> {
  const cep = normalizarCep(formData.get("cep"));
  if (!cep) return { erro: "Informe um CEP valido com 8 digitos." };

  const derivado = await buscarEnderecoPorCep(cep);
  if (derivado) return { endereco: derivado };

  if (sessao.isAdmin) {
    const bairro = textoEndereco(txt(formData.get("bairro")));
    const cidade = textoEndereco(txt(formData.get("cidade")));
    const uf = ufEndereco(txt(formData.get("uf")));
    if (bairro && cidade && uf) {
      return {
        endereco: {
          cep,
          logradouro: textoEndereco(txt(formData.get("logradouro"))),
          bairro,
          cidade,
          uf,
          origem: "manual_admin",
        },
      };
    }
  }

  return {
    erro:
      "Nao foi possivel derivar bairro, cidade e UF pelo CEP. Confira o CEP ou acione um admin para correcao.",
  };
}

function lerFotos(v: FormDataEntryValue | null): string[] {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    if (Array.isArray(arr))
      return arr.filter((x) => typeof x === "string").slice(0, 10);
  } catch {
    // ignora
  }
  return [];
}

async function montarPayload(
  formData: FormData,
  sessao: SessaoImoveis,
): Promise<
  | { erro: string }
  | { dados: Record<string, unknown>; enderecoOrigem: EnderecoDerivado["origem"] }
> {
  const tipo = txt(formData.get("tipo")) as Tipo | null;
  const status = (txt(formData.get("status")) ?? "rascunho") as Status;
  const tipo_negocio =
    txt(formData.get("tipo_negocio")) ?? TIPO_NEGOCIO_PADRAO;
  const valor_anuncio = num(formData.get("valor_anuncio"));
  const endereco = await resolverEndereco(formData, sessao);

  if (!tipo || !TIPOS.includes(tipo))
    return { erro: "Selecione um tipo de imovel valido." };
  if (!isTipoNegocio(tipo_negocio))
    return { erro: "Selecione se o anuncio e venda ou locacao." };
  if (!STATUSES.includes(status)) return { erro: "Status invalido." };
  if ("erro" in endereco) return endereco;
  if (valor_anuncio === null || valor_anuncio <= 0)
    return { erro: "Informe um valor de anuncio maior que zero." };

  return {
    dados: {
      cep: endereco.endereco.cep,
      logradouro:
        textoEndereco(txt(formData.get("logradouro"))) ??
        endereco.endereco.logradouro,
      numero: txt(formData.get("numero")),
      complemento: txt(formData.get("complemento")),
      bairro: endereco.endereco.bairro,
      cidade: endereco.endereco.cidade,
      uf: endereco.endereco.uf,
      tipo,
      tipo_negocio,
      area_m2: num(formData.get("area_m2")),
      quartos: int(formData.get("quartos")),
      vagas: int(formData.get("vagas")),
      ano_construcao: int(formData.get("ano_construcao")),
      valor_anuncio,
      status,
      fotos: lerFotos(formData.get("fotos")),
    },
    enderecoOrigem: endereco.endereco.origem,
  };
}

function perfilTermoAnunciante(papel: string): PerfilTermo {
  return papel === "corretor" ? "corretor" : "proprietario";
}

async function sincronizarServicoJuridicoImovel(params: {
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>;
  imovelId: string;
  formData: FormData;
  origem: "cadastro_imovel" | "edicao_imovel";
}) {
  const pacote = String(
    params.formData.get("servico_juridico_pacote") ?? PACOTE_NAO_CONTRATAR,
  );
  const tipoNegocio = String(
    params.formData.get("servico_juridico_tipo_negocio") ?? "venda",
  );
  const observacoes =
    String(params.formData.get("servico_juridico_observacoes") ?? "").trim() ||
    null;

  if (pacote === PACOTE_NAO_CONTRATAR) {
    if (params.origem === "edicao_imovel") {
      return cancelarContratacaoServicoJuridicoImovel({
        sessao: params.sessao,
        imovelId: params.imovelId,
      });
    }
    return { ok: true };
  }

  return registrarContratacaoServicoJuridico({
    sessao: params.sessao,
    pacote,
    tipoNegocio,
    origem: params.origem,
    imovelId: params.imovelId,
    observacoes,
  });
}

export async function criarImovel(
  _prev: ImovelState,
  formData: FormData,
): Promise<ImovelState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const perfilTermo = perfilTermoAnunciante(sessao.papel);
  if (await usuarioTemTermosPendentes(sessao.user.id, [perfilTermo])) {
    redirect(criarDestinoAceiteTermos([perfilTermo], "/painel/imoveis/novo", "imovel"));
  }
  if (!(await usuarioTemTelefoneObrigatorio(sessao.user.id))) {
    redirect(criarDestinoTelefone("/painel/imoveis/novo", "imovel"));
  }

  const r = await montarPayload(formData, sessao);
  if ("erro" in r) return { error: r.erro };

  const supabase = await createClient();
  if (sessao.papel === "cliente") {
    await supabase
      .from("usuarios")
      .update({ papel: "proprietario" })
      .eq("id", sessao.user.id);
  }

  const { data, error } = await supabase
    .from("imoveis")
    .insert({ ...r.dados, proprietario_id: sessao.user.id })
    .select("id")
    .single();

  if (error) return { error: "Nao foi possivel salvar o imovel." };

  await registrarEvento("imovel_cadastrado", {
    entidadeId: data.id,
    payload: {
      tipo: r.dados.tipo,
      tipo_negocio: r.dados.tipo_negocio,
      status: r.dados.status,
      endereco_origem: r.enderecoOrigem,
    },
  });

  const servico = await sincronizarServicoJuridicoImovel({
    sessao,
    imovelId: data.id,
    formData,
    origem: "cadastro_imovel",
  });

  revalidatePath("/painel/imoveis");
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    id: data.id,
    warning: servico.error
      ? `Imovel salvo, mas o servico juridico nao foi registrado: ${servico.error}`
      : undefined,
  };
}

export async function editarImovel(
  _prev: ImovelState,
  formData: FormData,
): Promise<ImovelState> {
  const sessao = await getSessao();
  if (!sessao) return { error: "Sessao expirada. Entre novamente." };

  const perfilTermo = perfilTermoAnunciante(sessao.papel);
  if (await usuarioTemTermosPendentes(sessao.user.id, [perfilTermo])) {
    redirect(criarDestinoAceiteTermos([perfilTermo], "/painel/imoveis", "imovel"));
  }

  const id = txt(formData.get("id"));
  if (!id) return { error: "Imovel nao identificado." };

  const r = await montarPayload(formData, sessao);
  if ("erro" in r) return { error: r.erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("imoveis")
    .update(r.dados)
    .eq("id", id);

  if (error) return { error: "Nao foi possivel atualizar o imovel." };

  await registrarEvento("imovel_editado", {
    entidadeId: id,
    payload: {
      tipo: r.dados.tipo,
      tipo_negocio: r.dados.tipo_negocio,
      status: r.dados.status,
      endereco_origem: r.enderecoOrigem,
    },
  });

  const servico = await sincronizarServicoJuridicoImovel({
    sessao,
    imovelId: id,
    formData,
    origem: "edicao_imovel",
  });

  revalidatePath("/painel/imoveis");
  revalidatePath(`/painel/imoveis/${id}`);
  return {
    ok: true,
    id,
    warning: servico.error
      ? `Imovel salvo, mas o servico juridico nao foi atualizado: ${servico.error}`
      : undefined,
  };
}

export async function arquivarImovel(formData: FormData): Promise<void> {
  const sessao = await getSessao();
  if (!sessao) return;

  const id = txt(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("imoveis")
    .update({ status: "arquivado" })
    .eq("id", id);

  if (error) return;

  await registrarEvento("imovel_arquivado", { entidadeId: id });
  revalidatePath("/painel/imoveis");
}
