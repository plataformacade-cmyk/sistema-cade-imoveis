"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook pro Sentry (S1.9): captura o erro não tratado.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Já registramos o problema. Tente de novo.
      </p>
      <Button onClick={reset}>Tentar de novo</Button>
    </main>
  );
}
