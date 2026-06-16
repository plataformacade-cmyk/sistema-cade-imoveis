// Formatadores compartilhados da área de Mensagens.

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d);
}

export function formatHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return fmtHora.format(d);
}

export function trecho(corpo: string | null | undefined, max = 80): string {
  if (!corpo) return "Sem mensagens ainda.";
  const limpo = corpo.replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo;
  return limpo.slice(0, max).trimEnd() + "…";
}
