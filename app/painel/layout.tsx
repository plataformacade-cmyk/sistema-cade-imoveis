import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/painel/painel-shell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notificacoes")
    .select("*", { count: "exact", head: true })
    .eq("lida", false);

  return (
    <PainelShell
      nome={sessao.user.nome}
      email={sessao.user.email}
      papel={sessao.papel}
      naoLidas={count ?? 0}
    >
      {children}
    </PainelShell>
  );
}
