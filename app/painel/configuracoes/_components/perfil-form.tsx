"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { atualizarPerfil, type ConfigState } from "@/actions/configuracoes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PerfilForm({
  usuarioId,
  nomeInicial,
  telefoneInicial,
  avatarInicial,
}: {
  usuarioId: string;
  nomeInicial: string;
  telefoneInicial: string;
  avatarInicial: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    atualizarPerfil,
    {},
  );

  const [avatar, setAvatar] = useState<string | null>(avatarInicial);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Perfil atualizado.");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  async function enviarAvatar(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setEnviandoAvatar(true);
    const supabase = createClient();
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const caminho = `${usuarioId}/avatar-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("usuario-avatares")
        .upload(caminho, file, { upsert: true });
      if (error) {
        toast.error("Falha ao enviar a foto.");
        return;
      }
      const { data } = supabase.storage
        .from("usuario-avatares")
        .getPublicUrl(caminho);

      const { error: erroUpdate } = await supabase
        .from("usuarios")
        .update({ avatar_url: data.publicUrl })
        .eq("id", usuarioId);
      if (erroUpdate) {
        toast.error("Foto enviada, mas não foi possível salvar.");
        return;
      }
      setAvatar(data.publicUrl);
      toast.success("Foto atualizada.");
      router.refresh();
    } finally {
      setEnviandoAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-foreground/10">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt="Sua foto"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground text-lg font-medium">
              {(nomeInicial.trim()[0] ?? "?").toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="avatar-input">Foto de perfil</Label>
          <Input
            id="avatar-input"
            ref={fileRef}
            type="file"
            accept="image/*"
            disabled={enviandoAvatar}
            onChange={(e) => enviarAvatar(e.target.files)}
          />
          {enviandoAvatar && (
            <span className="text-muted-foreground text-xs">
              Enviando foto...
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          type="text"
          defaultValue={nomeInicial}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          defaultValue={telefoneInicial}
          placeholder="(00) 00000-0000"
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending || enviandoAvatar}>
          {pending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}
