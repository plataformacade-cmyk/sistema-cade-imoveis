import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next 16: o antigo "middleware" agora se chama "proxy" (mesma função).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Casa tudo menos assets estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
