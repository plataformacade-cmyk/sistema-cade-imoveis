import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { enderecoResumido } from "../negocios/_lib";
import { formatDataHora, trecho } from "./_lib";

type ConversaLinha = {
  id: string;
  negocio_id: string;
  criado_em: string | null;
  negocios: {
    id: string;
    imoveis: {
      logradouro: string | null;
      numero: string | null;
      bairro: string | null;
      cidade: string | null;
    } | null;
  } | null;
  mensagens: {
    corpo: string | null;
    criado_em: string | null;
  }[];
};

export default async function MensagensPage() {
  const sessao = await getSessao();
  if (!sessao) {
    return (
      <p className="text-destructive text-sm">
        Sessão expirada. Entre novamente.
      </p>
    );
  }

  const supabase = await createClient();

  // Negócios em que o usuário tem algum papel.
  const { data: papeis } = await supabase
    .from("papeis_negocio")
    .select("negocio_id")
    .eq("usuario_id", sessao.user.id);

  const negocioIds = Array.from(
    new Set((papeis ?? []).map((p) => p.negocio_id as string)),
  );

  let conversas: ConversaLinha[] = [];
  let erro = false;

  if (negocioIds.length > 0) {
    const { data, error } = await supabase
      .from("conversas")
      .select(
        "id, negocio_id, criado_em, negocios(id, imoveis(logradouro, numero, bairro, cidade)), mensagens(corpo, criado_em)",
      )
      .in("negocio_id", negocioIds)
      .order("criado_em", { ascending: false });

    erro = Boolean(error);
    conversas = (data ?? []) as unknown as ConversaLinha[];
  }

  // Ordena cada conversa pela mensagem mais recente.
  function ultima(c: ConversaLinha) {
    const ms = (c.mensagens ?? [])
      .slice()
      .sort((a, b) =>
        String(b.criado_em ?? "").localeCompare(String(a.criado_em ?? "")),
      );
    return ms[0] ?? null;
  }

  const ordenadas = conversas.slice().sort((a, b) => {
    const ua = ultima(a)?.criado_em ?? a.criado_em ?? "";
    const ub = ultima(b)?.criado_em ?? b.criado_em ?? "";
    return String(ub).localeCompare(String(ua));
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mensagens</h1>
        <p className="text-muted-foreground text-sm">
          Conversas dos negócios em que você participa.
        </p>
      </div>

      {erro ? (
        <p className="text-destructive text-sm">
          Não foi possível carregar as conversas.
        </p>
      ) : ordenadas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Você ainda não tem conversas. Elas aparecem quando uma negociação
          começa um chat.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordenadas.map((c) => {
            const u = ultima(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/painel/mensagens/${c.id}`}
                  className="flex items-start justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {enderecoResumido(c.negocios?.imoveis ?? null)}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {trecho(u?.corpo)}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {u?.criado_em ? formatDataHora(u.criado_em) : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <Link
          href="/painel/negocios"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ver negócios
        </Link>
      </div>
    </div>
  );
}
