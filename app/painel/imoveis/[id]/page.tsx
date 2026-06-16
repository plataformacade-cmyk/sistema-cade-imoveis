import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ImovelForm, type ImovelEditavel } from "../_components/imovel-form";

export default async function EditarImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("imoveis")
    .select(
      "id, cep, logradouro, numero, complemento, bairro, cidade, uf, tipo, area_m2, quartos, vagas, ano_construcao, valor_anuncio, status, fotos",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  const imovel = data as ImovelEditavel;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar imóvel</h1>
        <p className="text-muted-foreground text-sm">
          Atualize os dados e salve.
        </p>
      </div>
      <ImovelForm imovel={imovel} usuarioId={sessao.user.id} />
    </div>
  );
}
