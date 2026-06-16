import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">
        Essa página não existe ou foi movida.
      </p>
      <Link href="/painel" className={buttonVariants()}>
        Voltar ao painel
      </Link>
    </main>
  );
}
