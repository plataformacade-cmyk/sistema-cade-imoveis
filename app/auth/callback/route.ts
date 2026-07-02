import { createClient } from "@/lib/supabase/server";
import { criarLoginHref, resolverAuthNext } from "@/lib/auth-redirect";
import { NextResponse } from "next/server";

// Callback do OAuth (Google) e da confirmacao de e-mail.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolverAuthNext(searchParams.get("next"), "/painel");

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) return NextResponse.redirect(`${origin}${next}`);

      console.error("auth_callback_exchange_failed", {
        name: error.name,
        status: "status" in error ? error.status : undefined,
        message: error.message,
      });
    } catch (error) {
      console.error("auth_callback_unhandled", serializarErro(error));
    }
  }

  const destinoErro = new URL(criarLoginHref(next), origin);
  destinoErro.searchParams.set("erro", "auth");
  return NextResponse.redirect(destinoErro);
}

function serializarErro(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { message: "Erro desconhecido" };
}
