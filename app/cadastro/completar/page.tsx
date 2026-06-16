import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

// Placeholder da escolha de papel inicial (S1.3).
// A atribuição real de papel acontece via papeis_negocio nas Sprints 2/3.
export default function CompletarCadastroPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Bem-vindo ao Cadê</CardTitle>
          <CardDescription>
            Em instantes você poderá anunciar ou buscar imóveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Seu papel (proprietário, comprador ou corretor) é definido conforme
            você usa a plataforma — você pode ser mais de um.
          </p>
          <Link href="/painel" className={buttonVariants()}>
            Ir para o painel
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
