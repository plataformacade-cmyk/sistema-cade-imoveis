"use client";

import { useActionState } from "react";
import { CalendarPlus } from "lucide-react";
import { sugerirVisitaNoChat, type VisitaState } from "@/actions/visitas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANAL_OPCOES } from "../../visitas/_lib";

export function SugerirVisitaForm({ conversaId }: { conversaId: string }) {
  const [state, formAction, pending] = useActionState<VisitaState, FormData>(
    sugerirVisitaNoChat,
    {},
  );

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[1fr_160px_auto]"
    >
      <input type="hidden" name="conversa_id" value={conversaId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="visita-data-hora">Data e hora</Label>
        <Input
          id="visita-data-hora"
          name="data_hora"
          type="datetime-local"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="visita-canal">Canal</Label>
        <Select
          name="canal"
          defaultValue="presencial"
          items={CANAL_OPCOES as unknown as { value: string; label: string }[]}
          required
        >
          <SelectTrigger id="visita-canal" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CANAL_OPCOES.map((canal) => (
              <SelectItem key={canal.value} value={canal.value}>
                {canal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          <CalendarPlus className="size-4" />
          {pending ? "Sugerindo..." : "Sugerir visita"}
        </Button>
      </div>

      <div className="md:col-span-3">
        <Label htmlFor="visita-observacoes">Observacoes</Label>
        <Textarea
          id="visita-observacoes"
          name="observacoes"
          placeholder="Ex.: melhor chegar pela portaria social."
          rows={2}
          className="mt-2"
        />
      </div>

      {(state.error || state.message) && (
        <p
          className={`text-sm ${
            state.error ? "text-destructive" : "text-muted-foreground"
          } md:col-span-3`}
        >
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
