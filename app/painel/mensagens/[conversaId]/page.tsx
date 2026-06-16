import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { enderecoResumido } from "../../negocios/_lib";
import { formatHora, formatDataHora } from "../_lib";
import { EnviarMensagemForm } from "../_components/enviar-mensagem-form";

type ConversaDetalhe = {
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
};

type MensagemLinha = {
  id: string;
  corpo: string | null;
  criado_em: string | null;
  autor_id: string;
  usuarios: { nome: string | null; email: string | null } | null;
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ conversaId: string }>;
}) {
  const { conversaId } = await params;

  const sessao = await getSessao();
  if (!sessao) {
    return (
      <p className="text-destructive text-sm">
        Sessão expirada. Entre novamente.
      </p>
    );
  }

  const supabase = await createClient();

  const [conversaRes, mensagensRes] = await Promise.all([
    supabase
      .from("conversas")
      .select(
        "id, negocio_id, criado_em, negocios(id, imoveis(logradouro, numero, bairro, cidade))",
      )
      .eq("id", conversaId)
      .maybeSingle(),
    supabase
      .from("mensagens")
      .select("id, corpo, criado_em, autor_id, usuarios(nome, email)")
      .eq("conversa_id", conversaId)
      .order("criado_em", { ascending: true }),
  ]);

  if (conversaRes.error) {
    return (
      <p className="text-destructive text-sm">
        Não foi possível carregar a conversa.
      </p>
    );
  }
  if (!conversaRes.data) notFound();

  const conversa = conversaRes.data as unknown as ConversaDetalhe;
  const mensagens = (mensagensRes.data ?? []) as unknown as MensagemLinha[];
  const titulo = enderecoResumido(conversa.negocios?.imoveis ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/painel/mensagens"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Mensagens
        </Link>
        <Link
          href={`/painel/negocios/${conversa.negocio_id}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Abrir negócio
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="text-muted-foreground text-sm">Conversa do negócio.</p>
      </div>

      <div className="flex flex-col gap-3">
        {mensagens.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Escreva a primeira abaixo.
          </p>
        ) : (
          mensagens.map((m) => {
            const meu = m.autor_id === sessao.user.id;
            const autor =
              m.usuarios?.nome || m.usuarios?.email || (meu ? "Você" : "—");
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${
                  meu ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    meu
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.corpo}</p>
                </div>
                <span
                  className="text-muted-foreground text-xs tabular-nums"
                  title={formatDataHora(m.criado_em)}
                >
                  {meu ? "Você" : autor} · {formatHora(m.criado_em)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t pt-4">
        <EnviarMensagemForm conversaId={conversa.id} />
      </div>
    </div>
  );
}
