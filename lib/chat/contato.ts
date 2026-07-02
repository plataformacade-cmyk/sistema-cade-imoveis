export type MotivoContatoExterno =
  | "email"
  | "telefone"
  | "whatsapp_link"
  | "convite_externo";

export type ResultadoContatoExterno = {
  bloqueado: boolean;
  motivos: MotivoContatoExterno[];
  textoMascarado: string;
};

export const AVISO_CONTATO_EXTERNO =
  "Para proteger a negociacao, mantenha telefone, WhatsApp e e-mail dentro da plataforma.";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const WHATSAPP_LINK_RE =
  /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)\/\S*/gi;
const CPF_RE = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_RE = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const PHONE_CANDIDATE_RE =
  /(?:\+?55[\s().-]*)?(?:\(?[1-9]{2}\)?[\s().-]*)?(?:9[\s().-]*)?\d{4}[\s.-]?\d{4}/g;

const FRASES_CONVITE = [
  /\b(?:me\s+)?chama.{0,24}\b(?:zap|whats|whatsapp|wpp)\b/,
  /\b(?:manda|envia|passa|me\s+manda).{0,24}\b(?:zap|whats|whatsapp|wpp|telefone|contato)\b/,
  /\b(?:zap|whats|whatsapp|wpp).{0,24}\b(?:me\s+chama|manda|envia|numero|telefone|contato)\b/,
  /\btratar.{0,24}\b(?:fora|por\s+fora)\b/,
  /\b(?:fora\s+da\s+plataforma|por\s+fora)\b/,
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function adicionarMotivo(
  motivos: MotivoContatoExterno[],
  motivo: MotivoContatoExterno,
) {
  if (!motivos.includes(motivo)) motivos.push(motivo);
}

function pareceTelefone(candidato: string, textoNormalizado: string) {
  const digits = candidato.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return false;
  if (CPF_RE.test(candidato) || CNPJ_RE.test(candidato)) return false;

  const temFormatoTelefone = /[()+\s.-]/.test(candidato);
  const indice = textoNormalizado.indexOf(candidato.toLowerCase());
  const janela =
    indice >= 0
      ? textoNormalizado.slice(Math.max(0, indice - 30), indice + candidato.length + 30)
      : "";
  const temContexto =
    /\b(?:telefone|celular|numero|n[uú]mero|zap|whats|whatsapp|wpp|liga|ligar)\b/.test(
      janela,
    );

  if (temFormatoTelefone || temContexto) return true;

  const nacional = digits.startsWith("55") ? digits.slice(2) : digits;
  if (nacional.length === 11 && nacional[2] === "9") return true;
  if (nacional.length === 10 && /[2-5]/.test(nacional[2] ?? "")) return true;

  return false;
}

function mascararTelefones(texto: string) {
  return texto.replace(PHONE_CANDIDATE_RE, (match) =>
    pareceTelefone(match, normalizar(texto)) ? "[contato removido]" : match,
  );
}

export function detectarContatoExterno(texto: string): ResultadoContatoExterno {
  const original = texto ?? "";
  const normalizado = normalizar(original);
  const motivos: MotivoContatoExterno[] = [];

  if (EMAIL_RE.test(original)) adicionarMotivo(motivos, "email");
  EMAIL_RE.lastIndex = 0;

  if (WHATSAPP_LINK_RE.test(original))
    adicionarMotivo(motivos, "whatsapp_link");
  WHATSAPP_LINK_RE.lastIndex = 0;

  for (const frase of FRASES_CONVITE) {
    if (frase.test(normalizado)) {
      adicionarMotivo(motivos, "convite_externo");
      break;
    }
  }

  for (const match of original.matchAll(PHONE_CANDIDATE_RE)) {
    if (pareceTelefone(match[0], normalizado)) {
      adicionarMotivo(motivos, "telefone");
      break;
    }
  }

  let textoMascarado = original
    .replace(EMAIL_RE, "[contato removido]")
    .replace(WHATSAPP_LINK_RE, "[contato removido]");
  textoMascarado = mascararTelefones(textoMascarado);

  if (textoMascarado.length > 500) {
    textoMascarado = `${textoMascarado.slice(0, 497)}...`;
  }

  return {
    bloqueado: motivos.length > 0,
    motivos,
    textoMascarado,
  };
}
