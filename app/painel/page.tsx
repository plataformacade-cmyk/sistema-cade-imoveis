import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Handshake,
  MessageSquare,
  Search,
  PlusCircle,
  Users,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraficoBarras } from "./_components/grafico-barras";

async function conta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabela: string,
) {
  // O RLS já escopa a contagem ao que o usuário pode ver.
  const { count } = await supabase
    .from(tabela)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

type Metrica = { label: string; valor: number; icon: typeof Building2; href: string };

export default async function PainelPage() {
  const sessao = await getSessao();
  const supabase = await createClient();
  const papel = sessao?.papel ?? "cliente";
  const primeiroNome = (sessao?.user.nome || "").split(" ")[0] || "bem-vindo";

  let metricas: Metrica[] = [];
  let acoes: { label: string; href: string; icon: typeof Search; primaria?: boolean }[] = [];
  let grafico: { label: string; valor: number }[] | null = null;

  if (papel === "cliente") {
    const [negocios, visitas, mensagens] = await Promise.all([
      conta(supabase, "negocios"),
      conta(supabase, "visitas"),
      conta(supabase, "mensagens"),
    ]);
    metricas = [
      { label: "Negociações", valor: negocios, icon: Handshake, href: "/painel/negocios" },
      { label: "Visitas agendadas", valor: visitas, icon: CalendarDays, href: "/painel/visitas" },
      { label: "Mensagens", valor: mensagens, icon: MessageSquare, href: "/painel/mensagens" },
    ];
    acoes = [
      { label: "Buscar imóveis", href: "/plataforma", icon: Search, primaria: true },
      { label: "Anunciar meu imóvel", href: "/painel/imoveis/novo", icon: PlusCircle },
    ];
  } else if (papel === "proprietario" || papel === "corretor") {
    const [imoveis, negocios, visitas] = await Promise.all([
      conta(supabase, "imoveis"),
      conta(supabase, "negocios"),
      conta(supabase, "visitas"),
    ]);
    metricas = [
      { label: "Meus imóveis", valor: imoveis, icon: Building2, href: "/painel/imoveis" },
      { label: "Negociações", valor: negocios, icon: Handshake, href: "/painel/negocios" },
      { label: "Visitas", valor: visitas, icon: CalendarDays, href: "/painel/visitas" },
    ];
    acoes = [
      { label: "Anunciar imóvel", href: "/painel/imoveis/novo", icon: PlusCircle, primaria: true },
      { label: "Ver negociações", href: "/painel/negocios", icon: Handshake },
    ];
  } else {
    const [imoveis, negocios, usuarios] = await Promise.all([
      conta(supabase, "imoveis"),
      conta(supabase, "negocios"),
      conta(supabase, "usuarios"),
    ]);
    metricas = [
      { label: "Imóveis", valor: imoveis, icon: Building2, href: "/painel/imoveis" },
      { label: "Negociações", valor: negocios, icon: Handshake, href: "/painel/negocios" },
      { label: "Usuários", valor: usuarios, icon: Users, href: "/painel/usuarios" },
    ];
    acoes = [
      { label: "Observabilidade", href: "/painel/observabilidade", icon: Search, primaria: true },
    ];
    // Gráfico: imóveis por bairro (top 6).
    const { data: linhas } = await supabase
      .from("imoveis")
      .select("bairro")
      .eq("status", "ativo");
    const porBairro = new Map<string, number>();
    for (const l of linhas ?? []) {
      const b = (l.bairro as string) || "Outros";
      porBairro.set(b, (porBairro.get(b) ?? 0) + 1);
    }
    grafico = [...porBairro.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, valor]) => ({ label, valor }));
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {primeiroNome}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {papel === "cliente"
            ? "Acompanhe suas negociações, visitas e conversas por aqui."
            : papel === "admin"
              ? "Visão geral da operação Cadê Imóveis."
              : "Acompanhe seus anúncios e negociações por aqui."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricas.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.label} href={m.href}>
              <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardDescription>{m.label}</CardDescription>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <CardTitle className="text-3xl tabular-nums">{m.valor}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {grafico && grafico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imóveis por bairro</CardTitle>
            <CardDescription>Anúncios ativos nos bairros com mais oferta.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoBarras dados={grafico} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {acoes.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={buttonVariants({
                variant: a.primaria ? "default" : "outline",
                size: "lg",
              })}
            >
              <Icon className="mr-1.5 size-4" />
              {a.label}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
