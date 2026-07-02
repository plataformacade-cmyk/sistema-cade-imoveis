import Link from "next/link";
import { ArrowRight, Handshake, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatBRL, rotuloStatus, variantStatus, enderecoResumido } from "./_lib";
import { AbrirNegocioDialog } from "./_components/abrir-negocio-dialog";
import { FollowupsExternosFila } from "./_components/followups-externos-fila";

type ImovelEmbed = {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  fotos: string[] | null;
} | null;

type NegocioLinha = {
  id: string;
  status: string;
  valor_acordado: number | null;
  criado_em: string | null;
  imoveis: ImovelEmbed;
};

type FollowupFila = {
  id: string;
  negocio_id: string;
  tipo: string;
  prazo_em: string;
  status: string;
  negocios: {
    id: string;
    status: string;
    imoveis: ImovelEmbed;
  } | null;
};

export default async function NegociosPage() {
  const sessao = await getSessao();
  const supabase = await createClient();
  const podeAbrir = sessao?.papel === "admin";
  const podeVerFilaFollowups =
    Boolean(sessao?.isAdmin) || sessao?.papel === "corretor";

  const [negociosRes, imoveisRes, followupsRes] = await Promise.all([
    supabase
      .from("negocios")
      .select(
        "id, status, valor_acordado, criado_em, imoveis(logradouro, numero, bairro, cidade, fotos)",
      )
      .order("criado_em", { ascending: false }),
    podeAbrir
      ? supabase
          .from("imoveis")
          .select("id, logradouro, numero, bairro, cidade")
          .order("logradouro", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    podeVerFilaFollowups
      ? supabase
          .from("negocio_followups_externos")
          .select(
            "id, negocio_id, tipo, prazo_em, status, negocios(id, status, imoveis(logradouro, numero, bairro, cidade))",
          )
          .eq("status", "pendente")
          .order("prazo_em", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const negocios = (negociosRes.data ?? []) as unknown as NegocioLinha[];
  const imoveis = (imoveisRes.data ?? []) as never[];
  const followups = (followupsRes.data ?? []) as unknown as FollowupFila[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Negociações</h1>
          <p className="text-sm text-muted-foreground">
            {sessao?.papel === "cliente"
              ? "Os imóveis em que você demonstrou interesse e as conversas em andamento."
              : "Acompanhe cada negociação: imóvel, conversa e propostas num só lugar."}
          </p>
        </div>
        {podeAbrir && <AbrirNegocioDialog imoveis={imoveis} />}
      </div>

      {podeVerFilaFollowups && <FollowupsExternosFila followups={followups} />}

      {negociosRes.error ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar as negociações.
        </p>
      ) : negocios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Handshake className="size-6" />
          </span>
          <p className="font-medium">Nenhuma negociação ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Encontrou um imóvel que gostou? Demonstre interesse e a conversa
            começa aqui.
          </p>
          <Link href="/plataforma" className={buttonVariants({ className: "mt-2" })}>
            Buscar imóveis
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {negocios.map((n) => {
            const foto = n.imoveis?.fotos?.[0];
            return (
              <Link
                key={n.id}
                href={`/painel/negocios/${n.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={foto}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <MapPin className="size-6" />
                    </div>
                  )}
                  <Badge
                    variant={variantStatus(n.status)}
                    className="absolute left-3 top-3 shadow-sm"
                  >
                    {rotuloStatus(n.status)}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="flex items-start gap-1.5 text-sm font-medium">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    {enderecoResumido(n.imoveis)}
                  </p>
                  {n.valor_acordado != null && (
                    <p className="text-sm text-muted-foreground">
                      Valor acordado:{" "}
                      <span className="font-semibold text-foreground">
                        {formatBRL(n.valor_acordado)}
                      </span>
                    </p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
                    Abrir negociação
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
