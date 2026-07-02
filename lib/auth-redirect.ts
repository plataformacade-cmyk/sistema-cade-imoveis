const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const AUTH_NEXT_PADRAO = "/painel";
export const CADASTRO_NEXT_PADRAO = "/cadastro/completar";

export function ehUuid(valor: string | null | undefined) {
  return Boolean(valor && UUID_RE.test(valor));
}

export function criarDestinoInteresse(imovelId: string | null | undefined) {
  const id = imovelId?.trim();
  if (!id || !ehUuid(id)) return null;
  return `/interesse/concluir?imovel_id=${encodeURIComponent(id)}`;
}

export function resolverAuthNext(
  valor: string | string[] | null | undefined,
  fallback = AUTH_NEXT_PADRAO,
) {
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

  return fallback;
}

export function ehDestinoInteresse(destino: string | null | undefined) {
  return resolverAuthNext(destino, "")?.startsWith("/interesse/concluir") ?? false;
}

export function criarLoginHref(next: string | null | undefined) {
  const destino = resolverAuthNext(next, AUTH_NEXT_PADRAO);
  if (destino === AUTH_NEXT_PADRAO) return "/login";
  return `/login?next=${encodeURIComponent(destino)}`;
}

export function criarCadastroHref(next: string | null | undefined) {
  const destino = resolverAuthNext(next, CADASTRO_NEXT_PADRAO);
  if (!ehDestinoInteresse(destino)) return "/cadastro";
  return `/cadastro?next=${encodeURIComponent(destino)}`;
}
