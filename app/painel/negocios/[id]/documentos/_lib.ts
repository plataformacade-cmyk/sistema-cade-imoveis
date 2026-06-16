// Rótulos e checklists da Due Diligence (documentos) + Garantia de locação.

import type { StatusVariant } from "../../_lib";

// Checklist de documentos exigidos por tipo de negócio.
export const CHECKLIST_VENDA = [
  { tipo: "matricula", label: "Matrícula do imóvel" },
  { tipo: "certidoes", label: "Certidões (negativas)" },
  { tipo: "iptu", label: "IPTU" },
  { tipo: "rg_cpf", label: "RG / CPF" },
  { tipo: "comprovante_renda", label: "Comprovante de renda" },
] as const;

export const CHECKLIST_LOCACAO = [
  { tipo: "rg_cpf", label: "RG / CPF" },
  {
    tipo: "comprovante_renda_3m",
    label: "Comprovante de renda (3 meses)",
  },
  { tipo: "spc_serasa", label: "Consulta SPC / Serasa" },
] as const;

export type ItemChecklist = { tipo: string; label: string };

export function checklistPara(tipoNegocio: string | null): ItemChecklist[] {
  return tipoNegocio === "locacao"
    ? [...CHECKLIST_LOCACAO]
    : [...CHECKLIST_VENDA];
}

export function rotuloTipoDoc(
  tipo: string,
  tipoNegocio: string | null,
): string {
  const lista = checklistPara(tipoNegocio);
  return lista.find((i) => i.tipo === tipo)?.label ?? tipo;
}

// Status de um documento.
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

// Tipos de garantia de locação (seleção ÚNICA — é lei).
export const GARANTIA_OPCOES = [
  { value: "fiador", label: "Fiador" },
  { value: "caucao", label: "Caução" },
  { value: "seguro_fianca", label: "Seguro-fiança" },
  { value: "titulo_capitalizacao", label: "Título de capitalização" },
] as const;

export function rotuloGarantia(tipo: string | null): string {
  if (!tipo) return "—";
  return GARANTIA_OPCOES.find((g) => g.value === tipo)?.label ?? tipo;
}
