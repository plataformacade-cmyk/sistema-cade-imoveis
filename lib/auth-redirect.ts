const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PERFIS_TERMOS = ["comprador", "proprietario", "corretor", "admin"] as const;

export const AUTH_NEXT_PADRAO = "/painel";
export const CADASTRO_NEXT_PADRAO = "/cadastro/completar";
export const TERMOS_NEXT_PADRAO = "/painel";

export function ehUuid(valor: string | null | undefined) {
  return Boolean(valor && UUID_RE.test(valor));
}

export function criarDestinoInteresse(imovelId: string | null | undefined) {
  const id = imovelId?.trim();
  if (!id || !ehUuid(id)) return null;
  return `/interesse/concluir?imovel_id=${encodeURIComponent(id)}`;
}

export function normalizarPerfisTermosParam(
  valor: string | string[] | null | undefined,
) {
  const raw = Array.isArray(valor) ? valor[0] : valor;
  const perfis = String(raw ?? "")
    .split(",")
    .map((perfil) => perfil.trim())
    .filter((perfil): perfil is (typeof PERFIS_TERMOS)[number] =>
      PERFIS_TERMOS.includes(perfil as (typeof PERFIS_TERMOS)[number]),
    );

  return Array.from(new Set(perfis));
}

function resolverAuthNextInterno(
  valor: string | string[] | null | undefined,
  fallback = AUTH_NEXT_PADRAO,
  permitirAceiteTermos = true,
): string {
  const raw = Array.isArray(valor) ? valor[0] : valor;
  const destino = raw?.trim();

  if (!destino) return fallback;

  let url: URL;
  try {
    url = new URL(destino, "https://cade.local");
  } catch {
    return fallback;
  }

  if (url.origin !== "https://cade.local") return fallback;

  if (url.pathname === "/painel" && !url.search) return AUTH_NEXT_PADRAO;
  if (url.pathname === "/cadastro/completar" && !url.search) {
    return CADASTRO_NEXT_PADRAO;
  }

  if (url.pathname === "/interesse/concluir") {
    const imovelId = url.searchParams.get("imovel_id");
    return criarDestinoInteresse(imovelId) ?? fallback;
  }

  if (permitirAceiteTermos && url.pathname === "/termos/aceite") {
    const perfis = normalizarPerfisTermosParam(url.searchParams.get("perfis"));
    if (perfis.length === 0) return fallback;
    const next = resolverAuthNextInterno(
      url.searchParams.get("next"),
      TERMOS_NEXT_PADRAO,
      false,
    );
    const origem = url.searchParams.get("origem")?.trim();
    return criarDestinoAceiteTermos(perfis, next, origem || undefined);
  }

  return fallback;
}

export function resolverAuthNext(
  valor: string | string[] | null | undefined,
  fallback = AUTH_NEXT_PADRAO,
) {
  return resolverAuthNextInterno(valor, fallback, true);
}

export function ehDestinoInteresse(destino: string | null | undefined) {
  return resolverAuthNext(destino, "")?.startsWith("/interesse/concluir") ?? false;
}

export function ehDestinoAceiteTermos(destino: string | null | undefined) {
  return resolverAuthNext(destino, "")?.startsWith("/termos/aceite") ?? false;
}

export function criarDestinoAceiteTermos(
  perfis: string[],
  next: string | null | undefined = TERMOS_NEXT_PADRAO,
  origem?: string,
) {
  const perfisValidos = Array.from(
    new Set(
      perfis.filter((perfil): perfil is (typeof PERFIS_TERMOS)[number] =>
        PERFIS_TERMOS.includes(perfil as (typeof PERFIS_TERMOS)[number]),
      ),
    ),
  );
  if (perfisValidos.length === 0) return TERMOS_NEXT_PADRAO;

  const nextSeguro = resolverAuthNextInterno(next, TERMOS_NEXT_PADRAO, false);
  const params = new URLSearchParams();
  params.set("perfis", perfisValidos.join(","));
  params.set("next", nextSeguro);
  if (origem?.trim()) params.set("origem", origem.trim().slice(0, 40));
  return `/termos/aceite?${params.toString()}`;
}

export function criarLoginHref(next: string | null | undefined) {
  const destino = resolverAuthNext(next, AUTH_NEXT_PADRAO);
  if (destino === AUTH_NEXT_PADRAO) return "/login";
  return `/login?next=${encodeURIComponent(destino)}`;
}

export function criarCadastroHref(next: string | null | undefined) {
  const destino = resolverAuthNext(next, CADASTRO_NEXT_PADRAO);
  if (!ehDestinoInteresse(destino) && !ehDestinoAceiteTermos(destino)) {
    return "/cadastro";
  }
  return `/cadastro?next=${encodeURIComponent(destino)}`;
}
