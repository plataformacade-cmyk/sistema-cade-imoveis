import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { ImovelForm } from "../_components/imovel-form";

export default async function NovoImovelPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo imóvel</h1>
        <p className="text-muted-foreground text-sm">
          Preencha as abas e salve. Começa como rascunho.
        </p>
      </div>
      <ImovelForm usuarioId={sessao.user.id} />
    </div>
  );
}
