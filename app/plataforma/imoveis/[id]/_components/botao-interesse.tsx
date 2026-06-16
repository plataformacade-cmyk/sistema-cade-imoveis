"use client";

import { useActionState } from "react";
import { Heart } from "lucide-react";
import { demonstrarInteresse, type InteresseState } from "@/actions/interesse";
import { Button } from "@/components/ui/button";

export function BotaoInteresse({ imovelId }: { imovelId: string }) {
  const [state, formAction, pending] = useActionState<InteresseState, FormData>(
    demonstrarInteresse,
    {},
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="imovel_id" value={imovelId} />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          <Heart className="mr-1.5 size-4" />
          {pending ? "Registrando..." : "Tenho interesse"}
        </Button>
      </form>
      {state.message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.message}
        </p>
      )}
      {state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
    </div>
  );
}
