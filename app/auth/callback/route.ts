import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Callback do OAuth (Google) e da confirmacao de e-mail.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolverDestino(searchParams.get("next"));

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

  return NextResponse.redirect(`${origin}/login?erro=auth`);
}

function resolverDestino(next: string | null) {
  if (next === "/cadastro/completar") return next;
  return "/painel";
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
