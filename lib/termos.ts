import { criarDestinoAceiteTermos } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/auth";

export type PerfilTermo = "comprador" | "proprietario" | "corretor" | "admin";

export type TermoVersao = {
  id: string;
  perfil: PerfilTermo;
  versao: string;
  titulo: string;
  conteudo: string;
  obrigatorio: boolean;
  publicado_em: string;
};

const PERFIS_TERMOS: PerfilTermo[] = [
  "comprador",
  "proprietario",
  "corretor",
  "admin",
];

export const PERFIL_TERMO_LABEL: Record<PerfilTermo, string> = {
  comprador: "Comprador",
  proprietario: "Proprietario",
  corretor: "Corretor",
  admin: "Administrador",
};

export function normalizarPerfisTermos(perfis: string[]) {
  return Array.from(
    new Set(
      perfis.filter((perfil): perfil is PerfilTermo =>
        PERFIS_TERMOS.includes(perfil as PerfilTermo),
      ),
    ),
  );
}

export function perfisTermosDoPapelGlobal(papel: Papel): PerfilTermo[] {
  if (papel === "cliente") return ["comprador"];
  return [papel];
}

export function perfisTermosDosPapeisNegocio(
  papeis: string[],
  incluirAdmin = false,
): PerfilTermo[] {
  const perfis = papeis
    .map((papel) => (papel === "comprador" ? "comprador" : papel))
    .filter((perfil): perfil is PerfilTermo =>
      PERFIS_TERMOS.includes(perfil as PerfilTermo),
    );

  if (incluirAdmin) perfis.push("admin");
  return normalizarPerfisTermos(perfis);
}

export async function listarTermosAtivos(
  perfis?: PerfilTermo[],
): Promise<TermoVersao[]> {
  const supabase = await createClient();
  let query = supabase
    .from("termos_versoes")
    .select("id, perfil, versao, titulo, conteudo, obrigatorio, publicado_em")
    .eq("ativo", true)
    .eq("obrigatorio", true)
    .order("perfil", { ascending: true })
    .order("publicado_em", { ascending: false });

  if (perfis?.length) query = query.in("perfil", perfis);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as TermoVersao[];
}

export async function carregarTermosPendentes(
  usuarioId: string,
  perfis: PerfilTermo[],
) {
  const perfisValidos = normalizarPerfisTermos(perfis);
  if (perfisValidos.length === 0) return [];

  const termos = await listarTermosAtivos(perfisValidos);
  if (termos.length === 0) return [];

  const supabase = await createClient();
  const { data: aceites } = await supabase
    .from("termos_aceites")
    .select("termo_versao_id")
    .eq("usuario_id", usuarioId)
    .in(
      "termo_versao_id",
      termos.map((termo) => termo.id),
    );

  const aceitos = new Set((aceites ?? []).map((aceite) => aceite.termo_versao_id));
  return termos.filter((termo) => !aceitos.has(termo.id));
}

export async function usuarioTemTermosPendentes(
  usuarioId: string,
  perfis: PerfilTermo[],
) {
  const pendentes = await carregarTermosPendentes(usuarioId, perfis);
  return pendentes.length > 0;
}

export async function registrarAceitesPendentes(params: {
  usuarioId: string;
  perfis: PerfilTermo[];
  origem: string;
}) {
  const pendentes = await carregarTermosPendentes(params.usuarioId, params.perfis);
  if (pendentes.length === 0) return [];

  const supabase = await createClient();
  const registros = pendentes.map((termo) => ({
    usuario_id: params.usuarioId,
    termo_versao_id: termo.id,
    perfil: termo.perfil,
    versao: termo.versao,
    origem: params.origem,
  }));

  const { error } = await supabase.from("termos_aceites").upsert(registros, {
    onConflict: "usuario_id,termo_versao_id",
    ignoreDuplicates: true,
  });

  if (error) throw error;

  await supabase
    .from("usuarios")
    .update({ termos_aceitos_em: new Date().toISOString() })
    .eq("id", params.usuarioId);

  return pendentes;
}

export function mensagemTermosPendentes(
  perfis: PerfilTermo[],
  next: string,
  origem: string,
) {
  const labels = normalizarPerfisTermos(perfis)
    .map((perfil) => PERFIL_TERMO_LABEL[perfil])
    .join(", ");
  const href = criarDestinoAceiteTermos(perfis, next, origem);
  return `Aceite os termos de ${labels || "uso"} antes de continuar: ${href}`;
}
