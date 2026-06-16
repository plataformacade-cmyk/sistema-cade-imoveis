"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Promove o usuário logado a proprietário (escolheu anunciar no onboarding). */
export async function tornarProprietario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("usuarios").update({ papel: "proprietario" }).eq("id", user.id);
  revalidatePath("/", "layout");
}
