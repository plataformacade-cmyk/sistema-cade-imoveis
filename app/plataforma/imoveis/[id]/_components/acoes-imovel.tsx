"use client";

import { useEffect, useState } from "react";
import { Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enviarEngajamentoImovel } from "@/lib/engajamento/browser";

const CHAVE = "cade:favoritos";

/**
 * Favoritar + Compartilhar no card do imóvel (inspiração QuintoAndar).
 * Favoritos ficam no localStorage do navegador (MVP, sem login). Compartilhar
 * usa a Web Share API nativa do celular; no desktop copia o link.
 */
export function AcoesImovel({
  imovelId,
  titulo,
}: {
  imovelId: string;
  titulo: string;
}) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const set = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
        setFav(Array.isArray(set) && set.includes(imovelId));
      } catch {
        /* ignora */
      }
    });
  }, [imovelId]);

  function toggleFav() {
    try {
      const set: string[] = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
      const novo = set.includes(imovelId)
        ? set.filter((i) => i !== imovelId)
        : [...set, imovelId];
      localStorage.setItem(CHAVE, JSON.stringify(novo));
      const agora = novo.includes(imovelId);
      setFav(agora);
      if (agora) toast.success("Adicionado aos favoritos");
      else toast("Removido dos favoritos");
    } catch {
      /* ignora */
    }
  }

  async function compartilhar() {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        enviarEngajamentoImovel(imovelId, "compartilhamento", {
          metadata: { metodo: "web_share" },
        });
        return;
      } catch {
        /* usuário cancelou — cai pro copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      enviarEngajamentoImovel(imovelId, "compartilhamento", {
        metadata: { metodo: "clipboard" },
      });
      toast.success("Link copiado!");
    } catch {
      toast("Copie o link: " + url);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="flex-1 gap-2"
        onClick={toggleFav}
        aria-pressed={fav}
      >
        <Heart className={"size-4 " + (fav ? "fill-primary text-primary" : "")} />
        {fav ? "Favoritado" : "Favoritar"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1 gap-2"
        onClick={compartilhar}
      >
        <Share2 className="size-4" />
        Compartilhar
      </Button>
    </div>
  );
}
