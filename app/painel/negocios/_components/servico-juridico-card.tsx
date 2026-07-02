"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  contratarServicoJuridico,
  atualizarStatusServicoJuridico,
} from "@/actions/servicos-juridicos";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PACOTE_SERVICO_JURIDICO_INFO,
  STATUS_SERVICO_JURIDICO,
  rotuloPacoteServico,
  rotuloStatusServico,
  type OrigemServicoJuridico,
  type PacoteServicoJuridico,
  type StatusServicoJuridico,
  type TipoNegocioServicoJuridico,
} from "@/lib/servicos-juridicos";

type ServicoJuridicoResumo = {
  id: string;
  pacote: string;
  status: string;
  tipo_negocio: string;
  origem: string;
  criado_em: string | null;
} | null;

type Props = {
  negocioId: string;
  imovelId: string | null;
  tipoNegocio: TipoNegocioServicoJuridico;
  origem: OrigemServicoJuridico;
  servico: ServicoJuridicoResumo;
  podeContratar: boolean;
  podeAtualizarStatus: boolean;
};

const statusBadge: Record<string, "default" | "secondary" | "outline"> = {
  contratado: "default",
  em_atendimento: "secondary",
  cancelado: "outline",
  concluido: "outline",
};

function pacotesPorTipo(tipo: TipoNegocioServicoJuridico) {
  return Object.entries(PACOTE_SERVICO_JURIDICO_INFO).filter(
    ([pacote, info]) =>
      pacote !== "nao_contratar" &&
      (!info.tipoPadrao || info.tipoPadrao === tipo),
  ) as Array<[PacoteServicoJuridico, (typeof PACOTE_SERVICO_JURIDICO_INFO)[PacoteServicoJuridico]]>;
}

export function ServicoJuridicoCard({
  negocioId,
  imovelId,
  tipoNegocio,
  origem,
  servico,
  podeContratar,
  podeAtualizarStatus,
}: Props) {
  const pacotes = pacotesPorTipo(tipoNegocio);
  const [pacote, setPacote] = useState<PacoteServicoJuridico>(
    pacotes[0]?.[0] ?? "analise_documental",
  );
  const [status, setStatus] = useState<StatusServicoJuridico>(
    (servico?.status as StatusServicoJuridico | undefined) ?? "contratado",
  );
  const [contratarState, contratarAction, contratando] = useActionState(
    contratarServicoJuridico,
    {},
  );
  const [statusState, statusAction, atualizandoStatus] = useActionState(
    atualizarStatusServicoJuridico,
    {},
  );

  useEffect(() => {
    if (contratarState.error) toast.error(contratarState.error);
    if (contratarState.message) toast.success(contratarState.message);
  }, [contratarState]);

  useEffect(() => {
    if (statusState.error) toast.error(statusState.error);
    if (statusState.message) toast.success(statusState.message);
  }, [statusState]);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Servicos juridicos Cade</CardDescription>
        <CardTitle>Oferta juridica e cartorial</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {servico ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  {rotuloPacoteServico(servico.pacote)}
                </p>
                <p className="text-muted-foreground text-sm">
                  Contratacao registrada. Pagamento e contato operacional sao
                  tratados fora do app nesta versao.
                </p>
              </div>
              <Badge variant={statusBadge[servico.status] ?? "outline"}>
                {rotuloStatusServico(servico.status)}
              </Badge>
            </div>

            {podeAtualizarStatus && (
              <form action={statusAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="contratacao_id" value={servico.id} />
                <Select
                  name="status"
                  value={status}
                  onValueChange={(v) =>
                    setStatus(String(v ?? "contratado") as StatusServicoJuridico)
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_SERVICO_JURIDICO.map((item) => (
                      <SelectItem key={item} value={item}>
                        {rotuloStatusServico(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={atualizandoStatus}
                >
                  {atualizandoStatus ? "Atualizando..." : "Atualizar status"}
                </Button>
              </form>
            )}
          </div>
        ) : podeContratar ? (
          <form action={contratarAction} className="flex flex-col gap-4">
            <input type="hidden" name="negocio_id" value={negocioId} />
            {imovelId && <input type="hidden" name="imovel_id" value={imovelId} />}
            <input type="hidden" name="tipo_negocio" value={tipoNegocio} />
            <input type="hidden" name="origem" value={origem} />
            <input type="hidden" name="pacote" value={pacote} />

            <p className="text-muted-foreground text-sm">
              Voce pode registrar a contratacao agora. Esta versao nao cobra
              online: valores, pagamento e atendimento serao combinados pela
              operacao.
            </p>

            <RadioGroup
              value={pacote}
              onValueChange={(v) => setPacote(String(v) as PacoteServicoJuridico)}
              className="grid gap-3 md:grid-cols-2"
            >
              {pacotes.map(([value, info]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:border-primary/60"
                >
                  <RadioGroupItem value={value} className="mt-1" />
                  <span className="flex flex-col gap-1">
                    <span className="font-medium">{info.label}</span>
                    <span className="text-muted-foreground">
                      {info.descricao}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`servico-observacoes-${origem}`}>Observacoes</Label>
              <Textarea
                id={`servico-observacoes-${origem}`}
                name="observacoes"
                placeholder="Contexto para o time juridico, se houver."
              />
            </div>

            <div>
              <Button type="submit" disabled={contratando}>
                {contratando ? "Contratando..." : "Contratar servico juridico"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhum servico juridico contratado para este fluxo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
