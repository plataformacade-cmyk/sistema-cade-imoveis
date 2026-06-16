"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  valor: { label: "Imóveis", color: "var(--primary)" },
} satisfies ChartConfig;

/** Gráfico de barras (bloco shadcn + recharts) usado no dashboard. */
export function GraficoBarras({
  dados,
}: {
  dados: { label: string; valor: number }[];
}) {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart accessibilityLayer data={dados} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
