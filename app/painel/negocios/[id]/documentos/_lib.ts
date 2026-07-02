import type { StatusVariant } from "../../_lib";

export type PerfilChecklist =
  | "comprador"
  | "vendedor"
  | "imovel"
  | "contrato_minuta";

export type ChecklistItem = {
  id: string;
  tipo_negocio: "venda" | "locacao" | "ambos";
  perfil: PerfilChecklist;
  codigo: string;
  titulo: string;
  descricao: string | null;
  obrigatorio: boolean;
  etapa: string;
  ordem: number;
};

export const PERFIL_CHECKLIST_LABEL: Record<PerfilChecklist, string> = {
  comprador: "Comprador / locatario",
  vendedor: "Vendedor / proprietario",
  imovel: "Imovel",
  contrato_minuta: "Contrato / minuta",
};

export const PERFIL_CHECKLIST_ORDEM: PerfilChecklist[] = [
  "comprador",
  "vendedor",
  "imovel",
  "contrato_minuta",
];

export function rotuloTipoDoc(tipo: string, itens: ChecklistItem[]): string {
  return itens.find((i) => i.codigo === tipo)?.titulo ?? tipo;
}

export const DOC_STATUS_OPCOES = [
  { value: "pendente", label: "Pendente" },
  { value: "recebido", label: "Recebido" },
  { value: "verificado", label: "Verificado" },
  { value: "reprovado", label: "Reprovado" },
] as const;

export function rotuloStatusDoc(status: string): string {
  return DOC_STATUS_OPCOES.find((s) => s.value === status)?.label ?? status;
}

export function variantStatusDoc(status: string): StatusVariant {
  switch (status) {
    case "verificado":
      return "default";
    case "reprovado":
      return "destructive";
    case "recebido":
      return "secondary";
    default:
      return "outline";
  }
}

export function statusAgregado(documentos: { status: string }[]): string {
  if (documentos.some((d) => d.status === "verificado")) return "verificado";
  if (documentos.some((d) => d.status === "reprovado")) return "reprovado";
  if (documentos.some((d) => d.status === "recebido")) return "recebido";
  return "pendente";
}

export const GARANTIA_OPCOES = [
  { value: "fiador", label: "Fiador" },
  { value: "caucao", label: "Caucao" },
  { value: "seguro_fianca", label: "Seguro-fianca" },
  { value: "titulo_capitalizacao", label: "Titulo de capitalizacao" },
] as const;

export function rotuloGarantia(tipo: string | null): string {
  if (!tipo) return "-";
  return GARANTIA_OPCOES.find((g) => g.value === tipo)?.label ?? tipo;
}
