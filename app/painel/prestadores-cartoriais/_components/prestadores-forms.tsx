"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Save } from "lucide-react";
import {
  atualizarStatusPrestadorCartorial,
  salvarCadastroPrestadorCartorial,
  type PrestadorCartorialState,
} from "@/actions/prestadores-cartoriais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const tipos = [
  ["tabeliao", "Tabeliao"],
  ["despachante", "Despachante"],
  ["assinante_cartorial", "Assinante cartorial"],
  ["agente_cartorial", "Agente cartorial"],
  ["juridico", "Juridico"],
  ["outro", "Outro"],
] as const;

const statuses = [
  ["pendente", "Pendente"],
  ["aprovado", "Aprovado"],
  ["reprovado", "Reprovado"],
  ["suspenso", "Suspenso"],
] as const;

function Feedback({ state }: { state: PrestadorCartorialState }) {
  useEffect(() => {
    if (state.message) toast.success(state.message);
    if (state.error) toast.error(state.error);
  }, [state]);

  if (!state.error && !state.message) return null;
  return (
    <p
      className={
        state.error
          ? "text-destructive text-xs"
          : "text-muted-foreground text-xs"
      }
    >
      {state.error ?? state.message}
    </p>
  );
}

type Prestador = {
  id: string;
  tipo: string;
  nome_exibicao: string;
  documento: string | null;
  registro_profissional: string | null;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  cidades_atuacao: string[] | null;
  documentos_qualificacao: string | null;
  status: string;
  observacoes_admin: string | null;
};

export function CadastroPrestadorCartorialForm({
  prestador,
  emailPadrao,
}: {
  prestador: Prestador | null;
  emailPadrao: string;
}) {
  const [state, action, pending] = useActionState<
    PrestadorCartorialState,
    FormData
  >(salvarCadastroPrestadorCartorial, {});

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label>Tipo de atuacao</Label>
        <select
          name="tipo"
          defaultValue={prestador?.tipo ?? "despachante"}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {tipos.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Nome de exibicao</Label>
        <Input
          name="nome_exibicao"
          defaultValue={prestador?.nome_exibicao ?? ""}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Empresa</Label>
        <Input name="empresa" defaultValue={prestador?.empresa ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Documento CPF/CNPJ</Label>
        <Input name="documento" defaultValue={prestador?.documento ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Registro profissional</Label>
        <Input
          name="registro_profissional"
          defaultValue={prestador?.registro_profissional ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Telefone</Label>
        <Input name="telefone" defaultValue={prestador?.telefone ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>E-mail operacional</Label>
        <Input
          name="email"
          type="email"
          defaultValue={prestador?.email ?? emailPadrao}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Cidades de atuacao</Label>
        <Input
          name="cidades_atuacao"
          placeholder="Uberlandia, Araguari"
          defaultValue={(prestador?.cidades_atuacao ?? []).join(", ")}
        />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Documentos ou links de qualificacao</Label>
        <Textarea
          name="documentos_qualificacao"
          defaultValue={prestador?.documentos_qualificacao ?? ""}
          placeholder="CRECI, CNJ, certificado, link de comprovacao ou observacoes de validacao."
        />
      </div>
      <div className="flex flex-col items-start gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Enviando..." : "Enviar para revisao"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function StatusPrestadorCartorialForm({
  prestador,
}: {
  prestador: Pick<
    Prestador,
    "id" | "tipo" | "status" | "observacoes_admin"
  >;
}) {
  const [state, action, pending] = useActionState<
    PrestadorCartorialState,
    FormData
  >(atualizarStatusPrestadorCartorial, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="prestador_id" value={prestador.id} />
      <div className="flex flex-col gap-1">
        <Label>Status</Label>
        <select
          name="status"
          defaultValue={prestador.status}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Tipo</Label>
        <select
          name="tipo"
          defaultValue={prestador.tipo}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {tipos.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Input
        name="observacoes_admin"
        placeholder="Observacao interna"
        defaultValue={prestador.observacoes_admin ?? ""}
        className="max-w-sm"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <CheckCircle2 className="size-4" />
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
