"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { enviarDocumento, type DocumentoState } from "@/actions/documentos";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Upload de um documento de um item do checklist. O arquivo vai direto do client
 * pro bucket privado `documentos-negocio` (path `${usuarioId}/...` pra passar na
 * RLS), e em seguida a Server Action grava a linha em `documentos`.
 */
export function EnviarDocumentoItem({
  negocioId,
  usuarioId,
  tipoDoc,
}: {
  negocioId: string;
  usuarioId: string;
  tipoDoc: string;
}) {
  const [state, formAction, pending] = useActionState<DocumentoState, FormData>(
    enviarDocumento,
    {},
  );
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reage ao retorno da Server Action.
  useEffect(() => {
    if (state.message) {
      toast.success(state.message);
      setArquivoUrl("");
      setNomeArquivo("");
      if (fileRef.current) fileRef.current.value = "";
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  async function enviarArquivo(file: File | undefined) {
    if (!file) return;
    setEnviando(true);
    const supabase = createClient();
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      // Path começa com a pasta do usuário pra passar na RLS do bucket privado.
      const caminho = `${usuarioId}/${negocioId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("documentos-negocio")
        .upload(caminho, file, { upsert: false });
      if (error) {
        toast.error(`Falha ao enviar ${file.name}.`);
        return;
      }
      // Guarda o path interno (bucket é privado — a leitura usa signed URL).
      setArquivoUrl(caminho);
      setNomeArquivo(file.name);
      toast.success("Arquivo enviado. Clique em Salvar para registrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="tipo_doc" value={tipoDoc} />
      <input type="hidden" name="arquivo_url" value={arquivoUrl} />

      <div className="flex flex-col gap-1">
        <Input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          disabled={enviando || pending}
          onChange={(e) => enviarArquivo(e.target.files?.[0])}
          className="max-w-xs"
        />
        {enviando && (
          <span className="text-muted-foreground text-xs">Enviando...</span>
        )}
        {nomeArquivo && !enviando && (
          <span className="text-muted-foreground text-xs">{nomeArquivo}</span>
        )}
      </div>

      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || enviando || !arquivoUrl}
      >
        <Upload className="size-4" />
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
