"use client";

import { useActionState, useMemo } from "react";
import { ClipboardList, MessageCircleQuestion } from "lucide-react";
import {
  salvarQualificacaoLead,
  type QualificacaoState,
} from "@/actions/qualificacoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type QualificacaoLeadResumo = {
  id: string;
  negocio_id: string;
  comprador_id: string;
  respostas: Record<string, unknown> | null;
  resumo: string | null;
  temperatura: string | null;
  concluida_em: string | null;
};

type Props = {
  negocioId: string;
  qualificacao: QualificacaoLeadResumo | null;
  papeisUsuario: string[];
  tipoNegocio: "venda" | "locacao";
};

const opcoesUrgencia = [
  ["agora", "Agora"],
  ["trinta_dias", "30 dias"],
  ["noventa_dias", "90 dias"],
  ["pesquisando", "Pesquisando"],
];

const opcoesComposicao = [
  ["sozinho", "Sozinho(a)"],
  ["casal", "Casal"],
  ["familia_criancas", "Familia com criancas"],
  ["familia_idosos", "Familia com idosos"],
  ["investir", "Investimento"],
];

const opcoesPrioridades = [
  ["trabalho", "Trabalho"],
  ["escola", "Escola"],
  ["familia", "Familia"],
  ["transporte", "Transporte"],
  ["seguranca", "Seguranca"],
  ["preco", "Preco"],
  ["lazer", "Lazer"],
];

const opcoesSimNao = [
  ["sim", "Sim"],
  ["talvez", "Talvez"],
  ["nao", "Nao"],
];

const temperaturaVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  quente: "default",
  morno: "secondary",
  frio: "outline",
};

function respostaTexto(
  respostas: Record<string, unknown> | null,
  chave: string,
) {
  const valor = respostas?.[chave];
  return typeof valor === "string" ? valor : "";
}

function respostaLista(
  respostas: Record<string, unknown> | null,
  chave: string,
) {
  const valor = respostas?.[chave];
  return Array.isArray(valor) ? valor.filter((item) => typeof item === "string") : [];
}

function RadioPills({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: string[][];
  defaultValue: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <label
          key={value}
          className="has-checked:border-primary has-checked:bg-primary/10 flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm"
        >
          <input
            className="sr-only"
            type="radio"
            name={name}
            value={value}
            defaultChecked={defaultValue === value}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function CheckboxPills({
  name,
  options,
  defaultValues,
}: {
  name: string;
  options: string[][];
  defaultValues: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <label
          key={value}
          className="has-checked:border-primary has-checked:bg-primary/10 flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm"
        >
          <input
            className="sr-only"
            type="checkbox"
            name={name}
            value={value}
            defaultChecked={defaultValues.includes(value)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export function QualificacaoLeadCard({
  negocioId,
  qualificacao,
  papeisUsuario,
  tipoNegocio,
}: Props) {
  const [state, formAction, pending] = useActionState<
    QualificacaoState,
    FormData
  >(salvarQualificacaoLead, {});
  const respostas = qualificacao?.respostas ?? null;
  const podeResponder = papeisUsuario.includes("comprador");
  const temperatura = qualificacao?.temperatura ?? "pendente";
  const prioridadeAtual = useMemo(
    () => respostaLista(respostas, "prioridades"),
    [respostas],
  );

  return (
    <Card id="qualificacao">
      <CardHeader>
        <CardDescription>Qualificacao do lead</CardDescription>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            {podeResponder ? (
              <MessageCircleQuestion className="size-5" />
            ) : (
              <ClipboardList className="size-5" />
            )}
            Interesse qualificado
          </CardTitle>
          <Badge variant={temperaturaVariant[temperatura] ?? "outline"}>
            {temperatura === "pendente" ? "Pendente" : temperatura}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {qualificacao?.resumo ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Resumo para abordagem</p>
            <p className="text-muted-foreground mt-1">{qualificacao.resumo}</p>
          </div>
        ) : !podeResponder ? (
          <p className="text-muted-foreground text-sm">
            Aguardando o comprador responder a qualificacao inicial.
          </p>
        ) : null}

        {podeResponder && (
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="negocio_id" value={negocioId} />

            <div className="rounded-xl bg-muted p-3 text-sm">
              O que voce procura nesse {tipoNegocio === "locacao" ? "aluguel" : "imovel"}?
            </div>

            <div className="flex flex-col gap-2">
              <Label>Quando pretende avancar?</Label>
              <RadioPills
                name="urgencia"
                options={opcoesUrgencia}
                defaultValue={respostaTexto(respostas, "urgencia")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Quem vai morar ou usar o imovel?</Label>
              <RadioPills
                name="composicao_familiar"
                options={opcoesComposicao}
                defaultValue={respostaTexto(respostas, "composicao_familiar")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>O que precisa ficar perto?</Label>
              <input
                name="rotina"
                defaultValue={respostaTexto(respostas, "rotina")}
                className="border-input bg-background h-9 rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Ex.: trabalho, escola, familia, acesso rapido..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Prioridades</Label>
              <CheckboxPills
                name="prioridades"
                options={opcoesPrioridades}
                defaultValues={prioridadeAtual}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Quer visitar?</Label>
                <RadioPills
                  name="quer_visitar"
                  options={opcoesSimNao}
                  defaultValue={respostaTexto(respostas, "quer_visitar")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Aceita imoveis similares?</Label>
                <RadioPills
                  name="aceita_similares"
                  options={opcoesSimNao}
                  defaultValue={respostaTexto(respostas, "aceita_similares")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="qualificacao-observacoes">Observacoes</Label>
              <Textarea
                id="qualificacao-observacoes"
                name="observacoes"
                rows={3}
                defaultValue={respostaTexto(respostas, "observacoes")}
                placeholder="Conte algum detalhe importante para a negociacao."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando..." : "Salvar qualificacao"}
              </Button>
              {(state.error || state.message) && (
                <span
                  className={`text-sm ${
                    state.error ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {state.error ?? state.message}
                </span>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
