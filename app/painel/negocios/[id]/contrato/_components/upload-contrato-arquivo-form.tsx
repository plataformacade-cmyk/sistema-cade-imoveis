"use client";

import { useActionState, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  anexarArquivoContrato,
  type ContratoState,
} from "@/actions/contratos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function UploadContratoArquivoForm({
  contratoId,
  negocioId,
  usuarioId,
}: {
  contratoId: string;
  negocioId: string;
  usuarioId: string;
}) {
  const [state, formAction, pending] = useActionState<ContratoState, FormData>(
    anexarArquivoContrato,
    {},
  );
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);

  async function enviarArquivo(file: File | undefined) {
    if (!file) return;
    setEnviando(true);
    const supabase = createClient();

    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const caminho = `${usuarioId}/${negocioId}/contratos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("documentos-negocio")
        .upload(caminho, file, { upsert: false });

      if (error) {
        toast.error(`Falha ao enviar ${file.name}.`);
        return;
      }

      setArquivoUrl(caminho);
      setArquivoNome(file.name);
      toast.success("Arquivo enviado. Clique em Salvar para registrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="contrato_id" value={contratoId} />
      <input type="hidden" name="arquivo_url" value={arquivoUrl} />
      <input type="hidden" name="arquivo_nome" value={arquivoNome} />

      <div className="flex flex-col gap-1">
        <Input
          type="file"
          accept="application/pdf,image/*"
          disabled={enviando || pending}
          onChange={(e) => enviarArquivo(e.target.files?.[0])}
          className="max-w-xs"
        />
        {enviando && (
          <span className="text-muted-foreground text-xs">Enviando...</span>
        )}
        {arquivoNome && !enviando && (
          <span className="text-muted-foreground text-xs">{arquivoNome}</span>
        )}
      </div>

      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || enviando || !arquivoUrl}
      >
        <Upload className="size-4" />
        {pending ? "Salvando..." : "Salvar contrato"}
      </Button>
    </form>
  );
}
