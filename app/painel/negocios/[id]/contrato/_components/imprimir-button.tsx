"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Aciona a impressão do navegador (window.print). O resumo imprimível usa
 * `print:` no Tailwind para esconder o resto da UI e mostrar só o contrato.
 */
export function ImprimirButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <Printer className="size-4" />
      Imprimir / Salvar PDF
    </Button>
  );
}
