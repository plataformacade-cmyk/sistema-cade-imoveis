"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITENS = {
  todos: "Todos",
  ativo: "Ativo",
  inativo: "Inativo",
  convidado: "Convidado",
};

export function FiltroStatus({ atual }: { atual: string }) {
  const router = useRouter();

  function aoMudar(valor: string) {
    if (!valor || valor === "todos") router.push("/painel/usuarios");
    else router.push(`/painel/usuarios?status=${valor}`);
  }

  return (
    <Select
      items={ITENS}
      value={atual || "todos"}
      onValueChange={(v) => aoMudar(String(v))}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos</SelectItem>
        <SelectItem value="ativo">Ativo</SelectItem>
        <SelectItem value="inativo">Inativo</SelectItem>
        <SelectItem value="convidado">Convidado</SelectItem>
      </SelectContent>
    </Select>
  );
}
