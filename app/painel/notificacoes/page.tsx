import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Bell, Handshake, MessageSquare, FileText, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  link: string | null;
  lida: boolean;
  criado_em: string;
};

const ICONE: Record<string, typeof Bell> = {
  interesse: Handshake,
  mensagem: MessageSquare,
  proposta: FileText,
  visita: CalendarDays,
  sistema: Bell,
};

async function marcarTodasLidas() {
  "use server";
  const supabase = await createClient();
  await supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel", "layout");
}

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notificacoes")
    .select("id, tipo, titulo, corpo, link, lida, criado_em")
    .order("criado_em", { ascending: false })
    .limit(50);
  const notifs = (data ?? []) as Notificacao[];
  const temNaoLida = notifs.some((n) => !n.lida);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Novos interesses, mensagens e propostas das suas negociações.
          </p>
        </div>
        {temNaoLida && (
          <form action={marcarTodasLidas}>
            <Button type="submit" variant="outline" size="sm">
              Marcar todas como lidas
            </Button>
          </form>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="size-6" />
          </span>
          <p className="font-medium">Nenhuma notificação por enquanto</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Quando você receber um interesse, mensagem ou proposta, aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifs.map((n) => {
            const Icon = ICONE[n.tipo] ?? Bell;
            const conteudo = (
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  n.lida ? "bg-card" : "border-primary/30 bg-primary/5"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    n.lida ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {n.titulo}
                    {!n.lida && <span className="size-2 rounded-full bg-primary" />}
                  </p>
                  {n.corpo && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.corpo}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{quando(n.criado_em)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? <Link href={n.link}>{conteudo}</Link> : conteudo}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
