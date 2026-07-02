import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { enderecoResumido } from "../../negocios/_lib";
import { formatHora, formatDataHora } from "../_lib";
import { EnviarMensagemForm } from "../_components/enviar-mensagem-form";
import { SugerirVisitaForm } from "../_components/sugerir-visita-form";
import { VisitaChatCard } from "../_components/visita-chat-card";

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
  tipo: string;
  metadata: unknown;
  usuarios: { nome: string | null; email: string | null } | null;
};

type VisitaLinha = {
  id: string;
  status: string;
  data_hora: string | null;
  canal: string | null;
  observacoes: string | null;
};

type VisitaMetadata = {
  visita_id?: string;
  data_hora?: string;
  canal?: string;
  observacoes?: string | null;
  status?: string;
};

function lerVisitaMetadata(valor: unknown): VisitaMetadata {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const metadata = valor as Record<string, unknown>;
  return {
    visita_id:
      typeof metadata.visita_id === "string" ? metadata.visita_id : undefined,
    data_hora:
      typeof metadata.data_hora === "string" ? metadata.data_hora : undefined,
    canal: typeof metadata.canal === "string" ? metadata.canal : undefined,
    observacoes:
      typeof metadata.observacoes === "string" ? metadata.observacoes : null,
    status: typeof metadata.status === "string" ? metadata.status : undefined,
  };
}

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
        Sessao expirada. Entre novamente.
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
      .select(
        "id, corpo, criado_em, autor_id, tipo, metadata, usuarios(nome, email)",
      )
      .eq("conversa_id", conversaId)
      .order("criado_em", { ascending: true }),
  ]);

  if (conversaRes.error) {
    return (
      <p className="text-destructive text-sm">
        Nao foi possivel carregar a conversa.
      </p>
    );
  }
  if (!conversaRes.data) notFound();

  const conversa = conversaRes.data as unknown as ConversaDetalhe;
  const mensagens = (mensagensRes.data ?? []) as unknown as MensagemLinha[];
  const titulo = enderecoResumido(conversa.negocios?.imoveis ?? null);

  const [papeisRes, visitasRes] = await Promise.all([
    supabase
      .from("papeis_negocio")
      .select("papel")
      .eq("negocio_id", conversa.negocio_id)
      .eq("usuario_id", sessao.user.id)
      .eq("ativo", true),
    supabase
      .from("visitas")
      .select("id, status, data_hora, canal, observacoes")
      .eq("negocio_id", conversa.negocio_id),
  ]);

  const papeisUsuario = (papeisRes.data ?? []).map((papel) =>
    String(papel.papel),
  );
  const podeSugerirVisita =
    sessao.isAdmin ||
    papeisUsuario.some((papel) =>
      ["proprietario", "corretor", "admin"].includes(papel),
    );
  const podeResponderVisita =
    sessao.isAdmin || papeisUsuario.includes("comprador");
  const visitasPorId = new Map(
    ((visitasRes.data ?? []) as VisitaLinha[]).map((visita) => [
      visita.id,
      visita,
    ]),
  );

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
          Abrir negocio
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="text-muted-foreground text-sm">Conversa do negocio.</p>
      </div>

      <div className="flex flex-col gap-3">
        {mensagens.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Escreva a primeira abaixo.
          </p>
        ) : (
          mensagens.map((mensagem) => {
            const meu = mensagem.autor_id === sessao.user.id;
            const autor =
              mensagem.usuarios?.nome ||
              mensagem.usuarios?.email ||
              (meu ? "Voce" : "-");
            const mensagemDeVisita = mensagem.tipo?.startsWith("visita_");
            const metadata = lerVisitaMetadata(mensagem.metadata);
            const visita = metadata.visita_id
              ? visitasPorId.get(metadata.visita_id)
              : null;

            return (
              <div
                key={mensagem.id}
                className={`flex flex-col gap-1 ${
                  meu ? "items-end" : "items-start"
                }`}
              >
                {mensagemDeVisita && metadata.visita_id ? (
                  <VisitaChatCard
                    conversaId={conversa.id}
                    visitaId={metadata.visita_id}
                    dataHora={visita?.data_hora ?? metadata.data_hora ?? null}
                    canal={visita?.canal ?? metadata.canal ?? null}
                    observacoes={
                      visita?.observacoes ?? metadata.observacoes ?? null
                    }
                    status={
                      visita?.status ??
                      metadata.status ??
                      "aguardando_confirmacao"
                    }
                    podeResponder={podeResponderVisita}
                  />
                ) : (
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      meu
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {mensagem.corpo}
                    </p>
                  </div>
                )}
                <span
                  className="text-muted-foreground text-xs tabular-nums"
                  title={formatDataHora(mensagem.criado_em)}
                >
                  {meu ? "Voce" : autor} · {formatHora(mensagem.criado_em)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t pt-4">
        {podeSugerirVisita && (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-sm font-medium">Sugerir visita</p>
            <SugerirVisitaForm conversaId={conversa.id} />
          </div>
        )}
        <EnviarMensagemForm conversaId={conversa.id} />
      </div>
    </div>
  );
}
