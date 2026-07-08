import "server-only";

import { timingSafeEqual } from "node:crypto";

export function limparEnvHermes(valor: string | undefined): string | undefined {
  return valor?.replace(/\uFEFF/g, "").trim();
}

function tokenBearer(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token ?? "" : "";
}

function safeEqual(a: string, b: string) {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function validarRequisicaoHermes(request: Request) {
  const expected = limparEnvHermes(process.env.HERMES_API_TOKEN);
  if (!expected) return false;
  return safeEqual(tokenBearer(request), expected);
}
