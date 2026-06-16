import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PainelShell } from "@/components/painel/painel-shell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  return (
    <PainelShell email={sessao.user.email} isAdmin={sessao.isAdmin}>
      {children}
    </PainelShell>
  );
}
