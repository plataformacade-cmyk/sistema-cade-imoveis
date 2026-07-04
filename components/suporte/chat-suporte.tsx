"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Headset,
  Loader2,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Autor = "usuario" | "assistente" | "humano";
type Msg = { id?: string; autor: Autor; corpo: string };

type Contexto = {
  logado: boolean;
  papel: string;
  saudacao: string;
  conversaId: string | null;
  status?: string | null;
  mensagens: { id: string; autor: Autor; corpo: string }[];
};

type VarianteUi = {
  abrir: string;
  fechar: string;
  dialogo: string;
  titulo: string;
  subtitulo: string;
  aguardando: string;
  acaoHumana: string;
  placeholder: string;
  login: string;
  escalado: string;
  saudacaoInicial: string;
  humanoLabel: string;
};

const UI_PUBLICA: VarianteUi = {
  abrir: "Abrir consultor de imóveis",
  fechar: "Fechar consultor de imóveis",
  dialogo: "Chat do consultor de imóveis da Cadê Imóveis",
  titulo: "Consultor Cadê",
  subtitulo: "Compra, venda e aluguel",
  aguardando: "Especialista a caminho...",
  acaoHumana: "Falar com especialista",
  placeholder: "Busque, anuncie ou tire uma dúvida...",
  login: "Entre na sua conta para salvar a conversa e falar com um especialista.",
  escalado:
    "Pedido enviado para um especialista da Cadê. Ele vai responder por aqui em breve.",
  saudacaoInicial:
    "Oi! Sou o consultor da Cadê Imóveis. Posso ajudar você a buscar, anunciar ou tirar dúvidas sobre imóveis.",
  humanoLabel: "Especialista",
};

const UI_SUPORTE: VarianteUi = {
  abrir: "Abrir suporte",
  fechar: "Fechar suporte",
  dialogo: "Chat de suporte da Cadê Imóveis",
  titulo: "Suporte Cadê",
  subtitulo: "Resposta na hora",
  aguardando: "Aguardando um atendente...",
  acaoHumana: "Falar com um atendente",
  placeholder: "Escreva sua dúvida...",
  login: "Entre na sua conta para falar com um atendente e salvar a conversa.",
  escalado:
    "Pedido enviado para a equipe da Cadê. Um atendente humano vai responder por aqui em breve.",
  saudacaoInicial: "Oi! Sou o assistente da Cadê Imóveis. Como posso ajudar?",
  humanoLabel: "Atendente",
};

/**
 * Widget global: em rotas públicas atua como consultor imobiliário; no painel,
 * mantém a linguagem operacional de suporte.
 */
export function ChatSuporte() {
  const pathname = usePathname();
  const publico = !pathname?.startsWith("/painel");
  const textoUi = publico ? UI_PUBLICA : UI_SUPORTE;
  const IconeChat = publico ? MessageCircle : Headset;

  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [logado, setLogado] = useState(true);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saudacaoTxt, setSaudacaoTxt] = useState(textoUi.saudacaoInicial);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const rolar = useCallback(() => {
    requestAnimationFrame(() =>
      fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, []);

  const carregarContexto = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/suporte", { cache: "no-store" });
      const data: Contexto = await r.json();
      setLogado(data.logado);
      setSaudacaoTxt(data.saudacao);
      setConversaId(data.conversaId);
      setStatus(data.status ?? null);
      setMsgs(
        data.mensagens.map((m) => ({
          id: m.id,
          autor: m.autor,
          corpo: m.corpo,
        })),
      );
      setIniciado(true);
    } catch {
      setIniciado(true);
    } finally {
      setCarregando(false);
      rolar();
    }
  }, [rolar]);

  function alternarAberto() {
    const proximoAberto = !aberto;
    setAberto(proximoAberto);
    if (proximoAberto && !iniciado) void carregarContexto();
  }

  useEffect(() => {
    if (!aberto || status !== "aguardando_humano" || !conversaId) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/suporte?conversaId=${conversaId}`, {
          cache: "no-store",
        });
        const data: Contexto = await r.json();
        setMsgs(
          data.mensagens.map((m) => ({
            id: m.id,
            autor: m.autor,
            corpo: m.corpo,
          })),
        );
        setStatus(data.status ?? null);
      } catch {
        /* silencioso */
      }
    }, 12_000);
    return () => clearInterval(t);
  }, [aberto, status, conversaId]);

  useEffect(() => {
    if (aberto) rolar();
  }, [msgs, aberto, rolar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const corpo = texto.trim();
    if (!corpo || enviando) return;
    setTexto("");
    setMsgs((m) => [...m, { autor: "usuario", corpo }]);
    setEnviando(true);
    try {
      const r = await fetch("/api/suporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId, mensagem: corpo }),
      });
      const data = await r.json();
      if (data.conversaId) setConversaId(data.conversaId);
      setLogado(data.logado ?? logado);
      if (data.resposta) {
        setMsgs((m) => [...m, { autor: "assistente", corpo: data.resposta }]);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        {
          autor: "assistente",
          corpo:
            "Tive um problema para responder agora. Tente de novo em instantes.",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  async function falarComAtendente() {
    if (!conversaId) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/suporte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId, acao: "escalar" }),
      });
      if (r.ok) {
        setStatus("aguardando_humano");
        setMsgs((m) => [
          ...m,
          {
            autor: "assistente",
            corpo: textoUi.escalado,
          },
        ]);
      }
    } finally {
      setEnviando(false);
    }
  }

  const semMensagens = msgs.length === 0;
  const saudacaoExibida = iniciado ? saudacaoTxt : textoUi.saudacaoInicial;

  return (
    <>
      <button
        type="button"
        onClick={alternarAberto}
        aria-label={aberto ? textoUi.fechar : textoUi.abrir}
        aria-expanded={aberto}
        className={cn(
          "fixed bottom-5 z-50 flex h-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform",
          "hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2",
          publico ? "left-5 gap-2 px-4" : "right-5 w-14",
        )}
      >
        {aberto ? <X className="size-6" /> : <IconeChat className="size-6" />}
        {!aberto && publico && (
          <span className="hidden whitespace-nowrap text-sm font-semibold sm:inline">
            Consultor de imóveis
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label={textoUi.dialogo}
          className={cn(
            "fixed bottom-24 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col",
            "h-[min(34rem,calc(100vh-8rem))] overflow-hidden rounded-2xl border bg-card shadow-2xl",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300",
            publico ? "left-5" : "right-5",
          )}
          style={{
            animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconeChat className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {textoUi.titulo}
              </p>
              <p className="text-xs text-muted-foreground">
                {status === "aguardando_humano"
                  ? textoUi.aguardando
                  : textoUi.subtitulo}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {carregando && (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}

            {!carregando && <Balao autor="assistente" corpo={saudacaoExibida} />}

            {msgs.map((m, i) => (
              <Balao
                key={m.id ?? i}
                autor={m.autor}
                corpo={m.corpo}
                humanoLabel={textoUi.humanoLabel}
              />
            ))}

            {enviando && (
              <div className="flex items-center gap-1.5 px-1 text-muted-foreground">
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {logado && status !== "aguardando_humano" && !semMensagens && (
            <div className="border-t px-4 py-2">
              <button
                type="button"
                onClick={falarComAtendente}
                disabled={enviando}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <UserRound className="size-3.5" />
                {textoUi.acaoHumana}
              </button>
            </div>
          )}

          <form onSubmit={enviar} className="flex items-end gap-2 border-t p-3">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(e);
                }
              }}
              rows={1}
              placeholder={textoUi.placeholder}
              className={cn(
                "max-h-28 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm",
                "outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar mensagem"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
                "transition-opacity hover:opacity-90 disabled:opacity-40",
              )}
            >
              <SendHorizontal className="size-4" />
            </button>
          </form>
          {!logado && (
            <p className="px-4 pb-3 text-center text-[11px] text-muted-foreground">
              <Sparkles className="mr-1 inline size-3" />
              {textoUi.login}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Balao({
  autor,
  corpo,
  humanoLabel = "Atendente",
}: {
  autor: Autor;
  corpo: string;
  humanoLabel?: string;
}) {
  const doUsuario = autor === "usuario";
  return (
    <div className={cn("flex", doUsuario ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          doUsuario
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : autor === "humano"
              ? "rounded-bl-sm bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50"
              : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {autor === "humano" && (
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium opacity-70">
            <UserRound className="size-3" /> {humanoLabel}
          </span>
        )}
        <ConteudoMensagem corpo={corpo} />
      </div>
    </div>
  );
}

function ConteudoMensagem({ corpo }: { corpo: string }) {
  const partes = corpo.split(/((?:https?:\/\/|\/)[^\s]+)/g);
  return (
    <>
      {partes.map((parte, index) => {
        const ehLink =
          /^https?:\/\//.test(parte) || parte.startsWith("/plataforma");
        if (!ehLink) return <span key={index}>{parte}</span>;
        return (
          <a
            key={index}
            href={parte}
            target={parte.startsWith("http") ? "_blank" : undefined}
            rel={parte.startsWith("http") ? "noreferrer" : undefined}
            className="font-medium underline underline-offset-2"
          >
            {parte}
          </a>
        );
      })}
    </>
  );
}
