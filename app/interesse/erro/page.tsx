import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  proprietario: {
    titulo: "Este anúncio é seu",
    texto: "Você não pode demonstrar interesse no próprio imóvel.",
  },
  indisponivel: {
    titulo: "Imóvel indisponível",
    texto: "Este imóvel não está mais disponível para novos interesses.",
  },
  invalido: {
    titulo: "Interesse não identificado",
    texto: "Não conseguimos identificar o imóvel de origem.",
  },
  erro: {
    titulo: "Não foi possível registrar o interesse",
    texto: "Tente novamente em alguns instantes.",
  },
};

export default async function InteresseErroPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string | string[] }>;
}) {
  const params = await searchParams;
  const motivo = Array.isArray(params.motivo) ? params.motivo[0] : params.motivo;
  const mensagem = MENSAGENS[motivo ?? ""] ?? MENSAGENS.erro;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mensagem.titulo}
        </h1>
        <p className="text-sm text-muted-foreground">{mensagem.texto}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/plataforma" className={buttonVariants()}>
        Buscar outros imóveis
        </Link>
        <Link
          href="/painel/negocios"
          className={buttonVariants({ variant: "outline" })}
        >
          Ver negociações
        </Link>
      </div>
    </main>
  );
}
