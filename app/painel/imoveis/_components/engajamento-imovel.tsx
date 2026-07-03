import { Activity, Clock, Eye, Flame, MousePointerClick, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MetricaEngajamentoImovel } from "@/lib/engajamento/imoveis";

const temperaturaLabel: Record<MetricaEngajamentoImovel["temperatura"], string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

const temperaturaClasse: Record<MetricaEngajamentoImovel["temperatura"], string> = {
  frio: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  morno:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  quente:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
};

function percentual(valor: number | null) {
  if (valor == null) return "—";
  return `${Math.round(valor * 100)}%`;
}

function duracao(valor: number | null) {
  if (valor == null) return "—";
  const segundos = Math.round(valor / 1000);
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto ? `${minutos}m ${resto}s` : `${minutos}m`;
}

export function TemperaturaEngajamentoBadge({
  temperatura,
}: {
  temperatura: MetricaEngajamentoImovel["temperatura"];
}) {
  return (
    <Badge variant="outline" className={temperaturaClasse[temperatura]}>
      <Flame className="size-3" />
      {temperaturaLabel[temperatura]}
    </Badge>
  );
}

export function EngajamentoResumoTabela({
  metrica,
}: {
  metrica: MetricaEngajamentoImovel;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <TemperaturaEngajamentoBadge temperatura={metrica.temperatura} />
        <span className="text-muted-foreground text-xs">
          {metrica.visualizacoes} views · {metrica.interessesRegistrados} interesses
        </span>
      </div>
      <div className="text-muted-foreground text-xs">
        {metrica.visitantesUnicos} visitantes estimados
        {metrica.origemPrincipal ? ` · origem: ${metrica.origemPrincipal}` : ""}
      </div>
    </div>
  );
}

function ItemMetrica({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof Eye;
  label: string;
  valor: string | number;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{valor}</div>
    </div>
  );
}

export function EngajamentoImovelCard({
  seteDias,
  trintaDias,
}: {
  seteDias: MetricaEngajamentoImovel;
  trintaDias: MetricaEngajamentoImovel;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Engajamento do anúncio</CardTitle>
            <CardDescription>
              Métricas agregadas. Dados individuais de visitantes e leads não são exibidos.
            </CardDescription>
          </div>
          <TemperaturaEngajamentoBadge temperatura={trintaDias.temperatura} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ItemMetrica
            icon={Eye}
            label="Views 30d"
            valor={trintaDias.visualizacoes}
          />
          <ItemMetrica
            icon={Activity}
            label="Visitantes"
            valor={trintaDias.visitantesUnicos}
          />
          <ItemMetrica
            icon={MousePointerClick}
            label="Interesses"
            valor={trintaDias.interessesRegistrados}
          />
          <ItemMetrica
            icon={Share2}
            label="Compart."
            valor={trintaDias.compartilhamentos}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ItemMetrica
            icon={Clock}
            label="Tempo médio 30d"
            valor={duracao(trintaDias.duracaoMediaMs)}
          />
          <ItemMetrica
            icon={MousePointerClick}
            label="Conversão 30d"
            valor={percentual(trintaDias.taxaConversao)}
          />
          <ItemMetrica
            icon={Activity}
            label="Origem principal"
            valor={trintaDias.origemPrincipal ?? "—"}
          />
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
          Últimos 7 dias: {seteDias.visualizacoes} views,{" "}
          {seteDias.interessesRegistrados} interesses e temperatura{" "}
          <strong className="text-foreground">
            {temperaturaLabel[seteDias.temperatura].toLowerCase()}
          </strong>
          .
        </div>
      </CardContent>
    </Card>
  );
}
