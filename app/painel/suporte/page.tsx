import Link from "next/link";
import { redirect } from "next/navigation";
import { Headset, UserRound, Bot, CheckCircle2, Clock, BriefcaseBusiness } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponderForm } from "./_components/responder-form";
import { resolverSuporte } from "@/actions/suporte";
import { Button, buttonVariants } from "@/components/ui/button";

type Conversa = {
  id: string;
  usuario_id: string;
  papel: string;
  assunto: string | null;
  status: string;
  atualizado_em: string;
  negocio_id: string | null;
  tipo: string;
  origem_negocio: string | null;
  contexto_snapshot: unknown;
};

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  aguardando_humano: { label: "Aguardando atendente", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  ativa: { label: "Com o assistente", cls: "bg-muted text-muted-foreground" },
  resolvida: { label: "Resolvida", cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
};

const ORDEM: Record<string, number> = { aguardando_humano: 0, ativa: 1, resolvida: 2 };
const TIPOS = [
  { value: "todos", label: "Todos" },
  { value: "geral", label: "Geral" },
  { value: "pos_conclusao", label: "Pos-conclusao" },
] as const;
const STATUS = [
  { value: "todos", label: "Todos status" },
  { value: "aguardando_humano", label: "Aguardando" },
  { value: "ativa", label: "Ativa" },
  { value: "resolvida", label: "Resolvida" },
] as const;
const ORIGEM_INFO: Record<string, string> = {
  servico_cade: "Servico Cade",
  externo: "Fluxo externo",
  cartorial: "Cartorial",
  manual: "Manual",
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function textoContexto(conversa: Conversa) {
  const contexto = asRecord(conversa.contexto_snapshot);
  const imovel = asRecord(contexto.imovel);
  const partes = [
    imovel.bairro,
    imovel.cidade,
    contexto.tipo_negocio,
    contexto.negocio_status,
  ]
    .map((item) => (typeof item === "string" ? item : null))
    .filter(Boolean);
  return partes.join(" - ");
}

function hrefFiltro(params: {
  tipo?: string;
  status?: string;
  negocio_id?: string;
}) {
  const qs = new URLSearchParams();
  if (params.tipo && params.tipo !== "todos") qs.set("tipo", params.tipo);
  if (params.status && params.status !== "todos") qs.set("status", params.status);
  if (params.negocio_id) qs.set("negocio_id", params.negocio_id);
  const query = qs.toString();
  return query ? `/painel/suporte?${query}` : "/painel/suporte";
}

export default async function SuportePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; tipo?: string; status?: string; negocio_id?: string }>;
}) {
  const sessao = await getSessao();
  if (!sessao?.isAdmin) redirect("/painel");
  const { c, tipo, status, negocio_id } = await searchParams;
  const tipoFiltro = tipo === "geral" || tipo === "pos_conclusao" ? tipo : undefined;
  const statusFiltro =
    status === "ativa" || status === "aguardando_humano" || status === "resolvida"
      ? status
      : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("suporte_conversas")
    .select("id, usuario_id, papel, assunto, status, atualizado_em, negocio_id, tipo, origem_negocio, contexto_snapshot")
    .order("atualizado_em", { ascending: false });
  if (tipoFiltro) query = query.eq("tipo", tipoFiltro);
  if (statusFiltro) query = query.eq("status", statusFiltro);
  if (negocio_id) query = query.eq("negocio_id", negocio_id);

  const { data: convsRaw } = await query;
  const convs = (convsRaw as Conversa[]) ?? [];
  convs.sort(
    (a, b) =>
      (ORDEM[a.status] ?? 9) - (ORDEM[b.status] ?? 9) ||
      b.atualizado_em.localeCompare(a.atualizado_em),
  );

  // Nomes dos solicitantes (uma consulta só).
  const ids = [...new Set(convs.map((x) => x.usuario_id))];
  const nomes = new Map<string, string>();
  if (ids.length) {
    const { data: us } = await supabase.from("usuarios").select("id, nome, email").in("id", ids);
    for (const u of us ?? []) nomes.set(u.id, (u.nome as string) || (u.email as string) || "Usuário");
  }

  const selecionada = c ? convs.find((x) => x.id === c) ?? null : convs[0] ?? null;
  let mensagens: { id: string; autor: string; corpo: string; criado_em: string }[] = [];
  if (selecionada) {
    const { data } = await supabase
      .from("suporte_mensagens")
      .select("id, autor, corpo, criado_em")
      .eq("conversa_id", selecionada.id)
      .order("criado_em", { ascending: true });
    mensagens = data ?? [];
  }

  const aguardando = convs.filter((x) => x.status === "aguardando_humano").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Headset className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
          <p className="text-sm text-muted-foreground">
            {aguardando > 0
              ? `${aguardando} chamado(s) aguardando atendimento.`
              : "Nenhum chamado na fila. O assistente está dando conta. 👌"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {TIPOS.map((item) => (
            <Link
              key={item.value}
              href={hrefFiltro({
                tipo: item.value,
                status: statusFiltro,
                negocio_id,
              })}
              className={buttonVariants({
                variant:
                  (item.value === "todos" && !tipoFiltro) ||
                  item.value === tipoFiltro
                    ? "default"
                    : "outline",
                size: "sm",
              })}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS.map((item) => (
            <Link
              key={item.value}
              href={hrefFiltro({
                tipo: tipoFiltro,
                status: item.value,
                negocio_id,
              })}
              className={buttonVariants({
                variant:
                  (item.value === "todos" && !statusFiltro) ||
                  item.value === statusFiltro
                    ? "default"
                    : "outline",
                size: "sm",
              })}
            >
              {item.label}
            </Link>
          ))}
          {negocio_id && (
            <Link
              href={hrefFiltro({ tipo: tipoFiltro, status: statusFiltro })}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Limpar negocio
            </Link>
          )}
        </div>
      </div>

      {convs.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Ainda não há conversas de suporte.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* Lista */}
          <div className="flex flex-col gap-2">
            {convs.map((cv) => {
              const ativa = selecionada?.id === cv.id;
              const info = STATUS_INFO[cv.status] ?? STATUS_INFO.ativa;
              return (
                <Link
                  key={cv.id}
                  href={`/painel/suporte?c=${cv.id}${
                    tipoFiltro ? `&tipo=${tipoFiltro}` : ""
                  }${statusFiltro ? `&status=${statusFiltro}` : ""}${
                    negocio_id ? `&negocio_id=${negocio_id}` : ""
                  }`}
                  className={`rounded-xl border p-3 transition-colors ${
                    ativa ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {nomes.get(cv.usuario_id) ?? "Usuário"}
                    </span>
                    {cv.status === "aguardando_humano" && (
                      <Clock className="size-3.5 shrink-0 text-amber-500" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {cv.assunto || "Conversa de suporte"}
                  </p>
                  {cv.tipo === "pos_conclusao" && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {textoContexto(cv) || "Ticket vinculado ao negocio"}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {cv.tipo === "pos_conclusao" && (
                        <Badge variant="outline" className="text-[10px]">
                          Pos-conclusao
                        </Badge>
                      )}
                      <Badge variant="secondary" className={`text-[10px] ${info.cls}`}>
                        {info.label}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{quando(cv.atualizado_em)}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Thread */}
          {selecionada && (
            <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <p className="text-sm font-semibold">{nomes.get(selecionada.usuario_id) ?? "Usuário"}</p>
                  <p className="text-xs capitalize text-muted-foreground">{selecionada.papel}</p>
                  {selecionada.tipo === "pos_conclusao" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Pos-conclusao</Badge>
                      {selecionada.origem_negocio && (
                        <Badge variant="secondary">
                          {ORIGEM_INFO[selecionada.origem_negocio] ??
                            selecionada.origem_negocio}
                        </Badge>
                      )}
                      {selecionada.negocio_id && (
                        <Link
                          href={`/painel/negocios/${selecionada.negocio_id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <BriefcaseBusiness className="size-4" />
                          Ver negocio
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                {selecionada.status !== "resolvida" && (
                  <form action={resolverSuporte}>
                    <input type="hidden" name="conversa_id" value={selecionada.id} />
                    <Button variant="outline" size="sm" type="submit">
                      <CheckCircle2 className="size-4" />
                      Marcar resolvida
                    </Button>
                  </form>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                {mensagens.map((m) => {
                  const doUsuario = m.autor === "usuario";
                  return (
                    <div key={m.id} className={`flex ${doUsuario ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          doUsuario
                            ? "rounded-bl-sm bg-card border"
                            : m.autor === "humano"
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-br-sm bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium opacity-70">
                          {m.autor === "usuario" ? (
                            <><UserRound className="size-3" /> Usuário</>
                          ) : m.autor === "humano" ? (
                            <><Headset className="size-3" /> Você (atendente)</>
                          ) : (
                            <><Bot className="size-3" /> Assistente</>
                          )}
                        </span>
                        <span className="whitespace-pre-wrap">{m.corpo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t p-3">
                <ResponderForm conversaId={selecionada.id} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
