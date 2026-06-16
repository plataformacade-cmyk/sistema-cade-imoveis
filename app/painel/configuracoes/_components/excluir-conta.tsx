"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { excluirConta, type ConfigState } from "@/actions/configuracoes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ExcluirConta() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    excluirConta,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Sua conta foi excluída.");
      router.replace("/login");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>
        Excluir minha conta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta</DialogTitle>
          <DialogDescription>
            Esta ação é permanente. Seus dados pessoais serão anonimizados e
            você perderá o acesso à plataforma. Não dá para desfazer.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Excluindo..." : "Sim, excluir minha conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
