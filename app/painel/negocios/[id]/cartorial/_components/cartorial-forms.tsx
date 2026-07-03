"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Paperclip, Play, Save } from "lucide-react";
import {
  anexarArquivoPendenciaCartorial,
  atualizarFluxoCartorial,
  atualizarPendenciaCartorial,
  concluirFluxoCartorial,
  criarPendenciaCartorial,
  iniciarFluxoCartorial,
  type CartorialState,
} from "@/actions/cartorial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const statusCartorial = [
  ["pendente", "Pendente"],
  ["documentos_cartorio", "Documentos do cartorio"],
  ["minuta", "Minuta"],
  ["itbi_custas", "ITBI e custas"],
  ["pendencias", "Pendencias"],
  ["agendado", "Agendado"],
  ["escritura", "Escritura"],
  ["registro", "Registro"],
  ["matricula_atualizada", "Matricula atualizada"],
  ["cancelado", "Cancelado"],
] as const;

const statusPendencia = [
  ["aberta", "Aberta"],
  ["em_andamento", "Em andamento"],
  ["resolvida", "Resolvida"],
  ["cancelada", "Cancelada"],
] as const;

const papeisPendencia = [
  ["operacao", "Operacao"],
  ["comprador", "Comprador"],
  ["proprietario", "Proprietario"],
  ["corretor", "Corretor"],
  ["admin", "Admin"],
] as const;

function Feedback({ state }: { state: CartorialState }) {
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

export function IniciarCartorialForm({ negocioId }: { negocioId: string }) {
  const [state, action, pending] = useActionState<CartorialState, FormData>(
    iniciarFluxoCartorial,
    {},
  );

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="negocio_id" value={negocioId} />
      <Button type="submit" disabled={pending}>
        <Play className="size-4" />
        {pending ? "Iniciando..." : "Iniciar cartorial"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function AtualizarFluxoCartorialForm({
  fluxo,
}: {
  fluxo: {
    id: string;
    status: string;
    cartorio_nome: string | null;
    cartorio_link: string | null;
    agendamento_em: string | null;
    agendamento_link: string | null;
    itbi_valor: number | null;
    custas_valor: number | null;
    observacoes: string | null;
  };
}) {
  const [state, action, pending] = useActionState<CartorialState, FormData>(
    atualizarFluxoCartorial,
    {},
  );
  const agendamento = fluxo.agendamento_em
    ? new Date(fluxo.agendamento_em).toISOString().slice(0, 16)
    : "";

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="fluxo_id" value={fluxo.id} />
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <select
          name="status"
          defaultValue={fluxo.status}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {statusCartorial.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Cartorio</Label>
        <Input name="cartorio_nome" defaultValue={fluxo.cartorio_nome ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Link do cartorio</Label>
        <Input
          name="cartorio_link"
          type="url"
          defaultValue={fluxo.cartorio_link ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Agendamento</Label>
        <Input
          name="agendamento_em"
          type="datetime-local"
          defaultValue={agendamento}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Link do agendamento</Label>
        <Input
          name="agendamento_link"
          type="url"
          defaultValue={fluxo.agendamento_link ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>ITBI</Label>
        <Input
          name="itbi_valor"
          inputMode="decimal"
          defaultValue={fluxo.itbi_valor ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Custas</Label>
        <Input
          name="custas_valor"
          inputMode="decimal"
          defaultValue={fluxo.custas_valor ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Observacoes</Label>
        <Textarea name="observacoes" defaultValue={fluxo.observacoes ?? ""} />
      </div>
      <div className="flex flex-col items-start gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Salvando..." : "Salvar cartorial"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function CriarPendenciaCartorialForm({ fluxoId }: { fluxoId: string }) {
  const [state, action, pending] = useActionState<CartorialState, FormData>(
    criarPendenciaCartorial,
    {},
  );

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="fluxo_id" value={fluxoId} />
      <div className="flex flex-col gap-2">
        <Label>Titulo</Label>
        <Input name="titulo" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Responsavel</Label>
        <select
          name="responsavel_papel"
          defaultValue="operacao"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {papeisPendencia.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Prazo</Label>
        <Input name="prazo_em" type="date" />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Descricao</Label>
        <Textarea name="descricao" />
      </div>
      <div className="flex flex-col items-start gap-2 md:col-span-2">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Criando..." : "Criar pendencia"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AtualizarPendenciaCartorialForm({
  pendenciaId,
  status,
}: {
  pendenciaId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<CartorialState, FormData>(
    atualizarPendenciaCartorial,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="pendencia_id" value={pendenciaId} />
      <select
        name="status"
        defaultValue={status}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
      >
        {statusPendencia.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Textarea
        name="observacao"
        placeholder="Observacao da atualizacao"
        className="min-h-12 text-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Atualizando..." : "Atualizar"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function AnexarCartorialForm({
  negocioId,
  fluxoId,
  pendenciaId,
  usuarioId,
}: {
  negocioId: string;
  fluxoId: string;
  pendenciaId?: string;
  usuarioId: string;
}) {
  const [state, action, pending] = useActionState<CartorialState, FormData>(
    anexarArquivoPendenciaCartorial,
    {},
  );
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviarArquivo(file: File | undefined) {
    if (!file) return;
    setEnviando(true);
    const supabase = createClient();
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const caminho = `${usuarioId}/${negocioId}/cartorial/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("documentos-negocio")
        .upload(caminho, file, { upsert: false });

      if (error) {
        toast.error(`Falha ao enviar ${file.name}.`);
        return;
      }

      setArquivoUrl(caminho);
      setArquivoNome(file.name);
      toast.success("Arquivo enviado. Clique em Salvar para registrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="fluxo_id" value={fluxoId} />
      {pendenciaId && (
        <input type="hidden" name="pendencia_id" value={pendenciaId} />
      )}
      <input type="hidden" name="arquivo_url" value={arquivoUrl} />
      <input type="hidden" name="arquivo_nome" value={arquivoNome} />
      <Input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        disabled={enviando || pending}
        onChange={(e) => enviarArquivo(e.target.files?.[0])}
        className="max-w-xs"
      />
      <Input
        name="descricao"
        placeholder="Descricao curta"
        className="max-w-xs"
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || enviando || !arquivoUrl}
      >
        <Paperclip className="size-4" />
        {pending ? "Salvando..." : "Salvar anexo"}
      </Button>
      {arquivoNome && !enviando && (
        <span className="text-muted-foreground text-xs">{arquivoNome}</span>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function ConcluirCartorialForm({ fluxoId }: { fluxoId: string }) {
  const [state, action, pending] = useActionState<CartorialState, FormData>(
    concluirFluxoCartorial,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="fluxo_id" value={fluxoId} />
      <Textarea
        name="confirmacao_operacional"
        placeholder="Confirmacao operacional quando a matricula final ainda nao estiver verificada no checklist."
      />
      <div className="flex flex-col items-start gap-2">
        <Button type="submit" disabled={pending}>
          <CheckCircle2 className="size-4" />
          {pending ? "Concluindo..." : "Concluir cartorial"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
