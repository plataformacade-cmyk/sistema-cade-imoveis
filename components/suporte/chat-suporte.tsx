"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Headset,
  X,
  SendHorizontal,
  Loader2,
  UserRound,
  Sparkles,
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

/**
 * Widget de suporte flutuante (canto inferior direito), em toda a plataforma.
 * Conversa com o agente da Cadê e, quando preciso, escala para um atendente
 * humano. Cliente leve: só carrega contexto quando o usuário abre o chat.
 */
export function ChatSuporte() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [logado, setLogado] = useState(true);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saudacaoTxt, setSaudacaoTxt] = useState(
    "Oi! Sou o assistente da Cadê Imóveis. Como posso ajudar?",
  );
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const rolar = useCallback(() => {
    requestAnimationFrame(() =>
      fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  }, []);

  // Carrega o contexto + histórico na primeira vez que abre.
  const carregarContexto = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/suporte", { cache: "no-store" });
      const data: Contexto = await r.json();
      setLogado(data.logado);
      setSaudacaoTxt(data.saudacao);
      setConversaId(data.conversaId);
      setStatus(data.status ?? null);
      setMsgs(data.mensagens.map((m) => ({ id: m.id, autor: m.autor, corpo: m.corpo })));
      setIniciado(true);
    } catch {
      setIniciado(true);
    } finally {
      setCarregando(false);
      rolar();
    }
  }, [rolar]);

  useEffect(() => {
    if (aberto && !iniciado) carregarContexto();
  }, [aberto, iniciado, carregarContexto]);

  // Enquanto aguarda atendente humano, busca novas respostas a cada 12s.
  useEffect(() => {
    if (!aberto || status !== "aguardando_humano" || !conversaId) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/suporte?conversaId=${conversaId}`, { cache: "no-store" });
        const data: Contexto = await r.json();
        setMsgs(data.mensagens.map((m) => ({ id: m.id, autor: m.autor, corpo: m.corpo })));
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
        { autor: "assistente", corpo: "Tive um problema para responder agora. Tente de novo em instantes." },
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
            corpo:
              "Pedido enviado para a equipe da Cadê. Um atendente humano vai responder por aqui em breve. 👍",
          },
        ]);
      }
    } finally {
      setEnviando(false);
    }
  }

  const semMensagens = msgs.length === 0;

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar suporte" : "Abrir suporte"}
        aria-expanded={aberto}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform",
          "hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {aberto ? <X className="size-6" /> : <Headset className="size-6" />}
      </button>

      {/* Painel */}
      {aberto && (
        <div
          role="dialog"
          aria-label="Chat de suporte da Cadê Imóveis"
          className={cn(
            "fixed bottom-24 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col",
            "overflow-hidden rounded-2xl border bg-card shadow-2xl",
            "h-[min(34rem,calc(100vh-8rem))] motion-safe:animate-in motion-safe:fade-in",
            "motion-safe:slide-in-from-bottom-4 motion-safe:duration-300",
          )}
          style={{
            animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Headset className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Suporte Cadê</p>
              <p className="text-xs text-muted-foreground">
                {status === "aguardando_humano"
                  ? "Aguardando um atendente…"
                  : "Resposta na hora"}
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

          {/* Mensagens */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {carregando && (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}

            {!carregando && (
              <Balao autor="assistente" corpo={saudacaoTxt} />
            )}

            {msgs.map((m, i) => (
              <Balao key={m.id ?? i} autor={m.autor} corpo={m.corpo} />
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

          {/* Ação: falar com atendente */}
          {logado && status !== "aguardando_humano" && !semMensagens && (
            <div className="border-t px-4 py-2">
              <button
                type="button"
                onClick={falarComAtendente}
                disabled={enviando}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <UserRound className="size-3.5" />
                Falar com um atendente
              </button>
            </div>
          )}

          {/* Entrada */}
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
              placeholder="Escreva sua dúvida…"
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
              Entre na sua conta para falar com um atendente e salvar a conversa.
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Balao({ autor, corpo }: { autor: Autor; corpo: string }) {
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
            <UserRound className="size-3" /> Atendente
          </span>
        )}
        {corpo}
      </div>
    </div>
  );
}
