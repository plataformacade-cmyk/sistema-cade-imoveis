"use client";

import { useActionState, useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import { demonstrarInteresse, type InteresseState } from "@/actions/interesse";
import { Button } from "@/components/ui/button";
import { coletarContextoEngajamento } from "@/lib/engajamento/browser";

export function BotaoInteresse({ imovelId }: { imovelId: string }) {
  const [state, formAction, pending] = useActionState<InteresseState, FormData>(
    demonstrarInteresse,
    {},
  );
  const visitanteRef = useRef<HTMLInputElement>(null);
  const origemRef = useRef<HTMLInputElement>(null);
  const referrerRef = useRef<HTMLInputElement>(null);
  const utmSourceRef = useRef<HTMLInputElement>(null);
  const utmMediumRef = useRef<HTMLInputElement>(null);
  const utmCampaignRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const contexto = coletarContextoEngajamento();
    if (visitanteRef.current) visitanteRef.current.value = contexto.visitanteId;
    if (origemRef.current) origemRef.current.value = contexto.origem;
    if (referrerRef.current) referrerRef.current.value = contexto.referrerHost ?? "";
    if (utmSourceRef.current) utmSourceRef.current.value = contexto.utmSource ?? "";
    if (utmMediumRef.current) utmMediumRef.current.value = contexto.utmMedium ?? "";
    if (utmCampaignRef.current) {
      utmCampaignRef.current.value = contexto.utmCampaign ?? "";
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="imovel_id" value={imovelId} />
        <input ref={visitanteRef} type="hidden" name="visitante_id" />
        <input ref={origemRef} type="hidden" name="origem" />
        <input ref={referrerRef} type="hidden" name="referrer_host" />
        <input ref={utmSourceRef} type="hidden" name="utm_source" />
        <input ref={utmMediumRef} type="hidden" name="utm_medium" />
        <input ref={utmCampaignRef} type="hidden" name="utm_campaign" />
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
