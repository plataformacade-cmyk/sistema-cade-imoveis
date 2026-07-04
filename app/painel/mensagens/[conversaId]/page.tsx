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
import { EnviarPropostaChatForm } from "../_components/enviar-proposta-chat-form";
import { PropostaChatCard } from "../_components/proposta-chat-card";
import { normalizarTipoNegocio } from "@/lib/negocios/tipo";

type ConversaDetalhe = {
  id: string;
  negocio_id: string;
  criado_em: string | null;
  negocios: {
    id: string;
    status: string;
    tipo: string | null;
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

type PropostaLinha = {
  id: string;
  autor_id: string;
  valor: number | null;
  condicoes: string | null;
  status: string;
  tipo_negocio: string | null;
  tipo_garantia: string | null;
  prazo_meses: number | null;
  reajuste_indice: string | null;
  dia_vencimento: number | null;
  encargos: string | null;
  usuarios: { nome: string | null; email: string | null } | null;
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

type PropostaMetadata = {
  proposta_id?: string;
  valor?: number | null;
  condicoes?: string | null;
  status?: string;
  tipo_negocio?: string | null;
  tipo_garantia?: string | null;
  prazo_meses?: number | null;
  reajuste_indice?: string | null;
  dia_vencimento?: number | null;
  encargos?: string | null;
};

function lerPropostaMetadata(valor: unknown): PropostaMetadata {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const metadata = valor as Record<string, unknown>;
  const valorProposta =
    typeof metadata.valor === "number" ? metadata.valor : null;
  return {
    proposta_id:
      typeof metadata.proposta_id === "string"
        ? metadata.proposta_id
        : undefined,
    valor: valorProposta,
    condicoes:
      typeof metadata.condicoes === "string" ? metadata.condicoes : null,
    status: typeof metadata.status === "string" ? metadata.status : undefined,
    tipo_negocio:
      typeof metadata.tipo_negocio === "string"
        ? metadata.tipo_negocio
        : null,
    tipo_garantia:
      typeof metadata.tipo_garantia === "string"
        ? metadata.tipo_garantia
        : null,
    prazo_meses:
      typeof metadata.prazo_meses === "number"
        ? metadata.prazo_meses
        : null,
    reajuste_indice:
      typeof metadata.reajuste_indice === "string"
        ? metadata.reajuste_indice
        : null,
    dia_vencimento:
      typeof metadata.dia_vencimento === "number"
        ? metadata.dia_vencimento
        : null,
    encargos: typeof metadata.encargos === "string" ? metadata.encargos : null,
  };
}

function statusPropostaPorTipo(tipo: string, fallback?: string) {
  if (tipo === "proposta_aceita") return "aceita";
  if (tipo === "proposta_recusada") return "recusada";
  if (tipo === "contraproposta_enviada") return "contraproposta";
  return fallback ?? "enviada";
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
        "id, negocio_id, criado_em, negocios(id, status, tipo, imoveis(logradouro, numero, bairro, cidade))",
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

  const [papeisRes, visitasRes, propostasRes] = await Promise.all([
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
    supabase
      .from("propostas")
      .select(
        "id, autor_id, valor, condicoes, status, tipo_negocio, tipo_garantia, prazo_meses, reajuste_indice, dia_vencimento, encargos, usuarios(nome, email)",
      )
      .eq("negocio_id", conversa.negocio_id),
  ]);

  const papeisUsuario = (papeisRes.data ?? []).map((papel) =>
    String(papel.papel),
  );
  const statusNegocio = conversa.negocios?.status ?? "";
  const tipoNegocio = normalizarTipoNegocio(conversa.negocios?.tipo ?? "venda");
  const podeSugerirVisita =
    sessao.isAdmin ||
    papeisUsuario.some((papel) =>
      ["proprietario", "corretor", "admin"].includes(papel),
    );
  const podeResponderVisita =
    sessao.isAdmin || papeisUsuario.includes("comprador");
  const podeEnviarProposta =
    (sessao.isAdmin || papeisUsuario.length > 0) &&
    !["concluido", "perdido"].includes(statusNegocio);
  const visitasPorId = new Map(
    ((visitasRes.data ?? []) as VisitaLinha[]).map((visita) => [
      visita.id,
      visita,
    ]),
  );
  const propostasPorId = new Map(
    ((propostasRes.data ?? []) as unknown as PropostaLinha[]).map(
      (proposta) => [proposta.id, proposta],
    ),
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
            const mensagemDeProposta =
              mensagem.tipo?.startsWith("proposta_") ||
              mensagem.tipo === "contraproposta_enviada";
            const metadata = lerVisitaMetadata(mensagem.metadata);
            const visita = metadata.visita_id
              ? visitasPorId.get(metadata.visita_id)
              : null;
            const propostaMetadata = lerPropostaMetadata(mensagem.metadata);
            const proposta = propostaMetadata.proposta_id
              ? propostasPorId.get(propostaMetadata.proposta_id)
              : null;
            const autorProposta =
              proposta?.usuarios?.nome ||
              proposta?.usuarios?.email ||
              autor;
            const podeResponderProposta =
              proposta != null &&
              podeEnviarProposta &&
              proposta.autor_id !== sessao.user.id &&
              ["enviada", "contraproposta"].includes(proposta.status);

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
                ) : mensagemDeProposta && propostaMetadata.proposta_id ? (
                  <PropostaChatCard
                    conversaId={conversa.id}
                    negocioId={conversa.negocio_id}
                    propostaId={propostaMetadata.proposta_id}
                    autorNome={autorProposta}
                    valor={proposta?.valor ?? propostaMetadata.valor ?? null}
                    condicoes={
                      proposta?.condicoes ?? propostaMetadata.condicoes ?? null
                    }
                    status={statusPropostaPorTipo(
                      mensagem.tipo,
                      proposta?.status ?? propostaMetadata.status,
                    )}
                    podeResponder={podeResponderProposta}
                    tipoNegocio={
                      proposta?.tipo_negocio ??
                      propostaMetadata.tipo_negocio ??
                      tipoNegocio
                    }
                    tipoGarantia={
                      proposta?.tipo_garantia ??
                      propostaMetadata.tipo_garantia ??
                      null
                    }
                    prazoMeses={
                      proposta?.prazo_meses ??
                      propostaMetadata.prazo_meses ??
                      null
                    }
                    reajusteIndice={
                      proposta?.reajuste_indice ??
                      propostaMetadata.reajuste_indice ??
                      null
                    }
                    diaVencimento={
                      proposta?.dia_vencimento ??
                      propostaMetadata.dia_vencimento ??
                      null
                    }
                    encargos={
                      proposta?.encargos ?? propostaMetadata.encargos ?? null
                    }
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
        {podeEnviarProposta && (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-sm font-medium">Enviar proposta</p>
            <EnviarPropostaChatForm
              negocioId={conversa.negocio_id}
              conversaId={conversa.id}
              tipoNegocio={tipoNegocio}
            />
          </div>
        )}
        <EnviarMensagemForm conversaId={conversa.id} />
      </div>
    </div>
  );
}
