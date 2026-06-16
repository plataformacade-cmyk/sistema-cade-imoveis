import Link from "next/link";
import { redirect } from "next/navigation";
import { Headset, UserRound, Bot, CheckCircle2, Clock } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponderForm } from "./_components/responder-form";
import { resolverSuporte } from "@/actions/suporte";
import { Button } from "@/components/ui/button";

type Conversa = {
  id: string;
  usuario_id: string;
  papel: string;
  assunto: string | null;
  status: string;
  atualizado_em: string;
};

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  aguardando_humano: { label: "Aguardando atendente", cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  ativa: { label: "Com o assistente", cls: "bg-muted text-muted-foreground" },
  resolvida: { label: "Resolvida", cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
};

const ORDEM: Record<string, number> = { aguardando_humano: 0, ativa: 1, resolvida: 2 };

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function SuportePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const sessao = await getSessao();
  if (!sessao?.isAdmin) redirect("/painel");
  const { c } = await searchParams;

  const supabase = await createClient();
  const { data: convsRaw } = await supabase
    .from("suporte_conversas")
    .select("id, usuario_id, papel, assunto, status, atualizado_em")
    .order("atualizado_em", { ascending: false });
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
                  href={`/painel/suporte?c=${cv.id}`}
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
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="secondary" className={`text-[10px] ${info.cls}`}>
                      {info.label}
                    </Badge>
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
