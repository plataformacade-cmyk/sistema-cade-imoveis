import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TABELAS = [
  { tabela: "imoveis", label: "Imóveis" },
  { tabela: "negocios", label: "Negócios" },
  { tabela: "usuarios", label: "Usuários" },
] as const;

export default async function PainelPage() {
  const supabase = await createClient();
  const valores = await Promise.all(
    TABELAS.map((t) =>
      supabase
        .from(t.tabela)
        .select("*", { count: "exact", head: true })
        .then((r) => r.count ?? 0),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-muted-foreground text-sm">
          Visão geral da operação Cadê Imóveis.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TABELAS.map((t, i) => (
          <Card key={t.tabela}>
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {valores[i]}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
