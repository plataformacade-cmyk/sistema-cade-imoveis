"use client";

import { useEffect } from "react";
import { enviarEngajamentoImovel } from "@/lib/engajamento/browser";

export function EngajamentoTracker({ imovelId }: { imovelId: string }) {
  useEffect(() => {
    const inicio = Date.now();
    let enviouTempo = false;

    enviarEngajamentoImovel(imovelId, "visualizacao_detalhe", {
      metadata: { origem: "detalhe_publico" },
    });

    function enviarTempo() {
      if (enviouTempo) return;
      enviouTempo = true;
      const duracaoMs = Date.now() - inicio;
      if (duracaoMs < 5_000) return;
      enviarEngajamentoImovel(imovelId, "tempo_visualizacao", {
        duracaoMs,
        metadata: { origem: "detalhe_publico" },
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") enviarTempo();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", enviarTempo);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", enviarTempo);
      enviarTempo();
    };
  }, [imovelId]);

  return null;
}
