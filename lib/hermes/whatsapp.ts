import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { limparEnvHermes } from "@/lib/hermes/auth";
import { registrarEventoAdmin } from "@/lib/log";

export const WHATSAPP_TEMPLATES = [
  "cade_interesse_novo",
  "cade_visita_confirmada",
  "cade_documentos_pendentes",
  "cade_followup_dia_7",
  "cade_suporte_humano",
] as const;

export type WhatsappTemplate = (typeof WHATSAPP_TEMPLATES)[number];

type EnviarWhatsappParams = {
  usuarioId?: string;
  telefone?: string;
  template: WhatsappTemplate;
  variaveis?: string[];
  dryRun?: boolean;
  teste?: boolean;
};

function texto(valor: unknown, limite = 120) {
  return typeof valor === "string"
    ? valor
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limite)
    : "";
}

export function isWhatsappTemplate(value: string): value is WhatsappTemplate {
  return WHATSAPP_TEMPLATES.includes(value as WhatsappTemplate);
}

export function normalizarTelefoneE164(value: string) {
  const limpo = value.replace(/[^\d+]/g, "");
  if (limpo.startsWith("+")) return limpo;
  const digitos = limpo.replace(/\D/g, "");
  if (digitos.length === 11 || digitos.length === 10) return `+55${digitos}`;
  if (digitos.length >= 8 && digitos.length <= 15) return `+${digitos}`;
  return "";
}

function mascararTelefone(e164: string) {
  if (!e164) return "";
  const inicio = e164.slice(0, 5);
  const fim = e164.slice(-2);
  return `${inicio}${"*".repeat(Math.max(e164.length - 7, 4))}${fim}`;
}

function variaveisSeguras(values: unknown) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => texto(value, 80)).filter(Boolean).slice(0, 8);
}

async function registrarEnvio(params: {
  usuarioId?: string | null;
  telefone: string;
  template: string;
  status: string;
  providerMessageId?: string | null;
  erroCodigo?: string | null;
  payload?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("whatsapp_envios").insert({
    usuario_id: params.usuarioId ?? null,
    telefone_mascarado: mascararTelefone(params.telefone),
    provider: "meta_cloud",
    template: params.template,
    status: params.status,
    provider_message_id: params.providerMessageId ?? null,
    erro_codigo: params.erroCodigo ?? null,
    payload: params.payload ?? {},
  });
}

async function resolverTelefone(params: Pick<EnviarWhatsappParams, "usuarioId" | "telefone" | "teste">) {
  if (params.teste) {
    return normalizarTelefoneE164(limparEnvHermes(process.env.WHATSAPP_TEST_TO) ?? "");
  }
  if (params.telefone) return normalizarTelefoneE164(params.telefone);
  if (!params.usuarioId) return "";

  const admin = createAdminClient();
  const { data } = await admin
    .from("usuarios")
    .select("telefone")
    .eq("id", params.usuarioId)
    .maybeSingle();
  return normalizarTelefoneE164(data?.telefone ?? "");
}

async function buscarConsentimento(usuarioId: string | undefined) {
  if (!usuarioId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("whatsapp_consentimentos")
    .select("opt_in, opt_out, telefone_e164")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data ?? null;
}

function montarTemplatePayload(template: WhatsappTemplate, variaveis: string[]) {
  const components = variaveis.length
    ? [
        {
          type: "body",
          parameters: variaveis.map((value) => ({ type: "text", text: value })),
        },
      ]
    : undefined;

  return {
    messaging_product: "whatsapp",
    type: "template",
    template: {
      name: template,
      language: { code: "pt_BR" },
      ...(components ? { components } : {}),
    },
  };
}

export async function enviarWhatsappHermes(params: EnviarWhatsappParams) {
  const template = params.template;
  const variaveis = variaveisSeguras(params.variaveis);
  const telefone = await resolverTelefone(params);

  if (!telefone) {
    return { ok: false, erro: "telefone_invalido", status: 400 };
  }

  const consentimento = await buscarConsentimento(params.usuarioId);
  const testeControlado =
    params.teste &&
    telefone === normalizarTelefoneE164(limparEnvHermes(process.env.WHATSAPP_TEST_TO) ?? "");

  if (!testeControlado && !params.usuarioId && !params.dryRun) {
    await registrarEnvio({
      telefone,
      template,
      status: "bloqueado_opt_in",
      erroCodigo: "missing_usuario_opt_in",
    });
    await registrarEventoAdmin("whatsapp_envio_bloqueado", {
      payload: { motivo: "missing_usuario_opt_in", template },
    });
    return { ok: false, erro: "missing_usuario_opt_in", status: 403 };
  }

  if (!testeControlado && params.usuarioId && !consentimento?.opt_in) {
    await registrarEnvio({
      usuarioId: params.usuarioId,
      telefone,
      template,
      status: "bloqueado_opt_in",
      erroCodigo: "missing_opt_in",
    });
    await registrarEventoAdmin("whatsapp_envio_bloqueado", {
      payload: { motivo: "missing_opt_in", template },
    });
    return { ok: false, erro: "missing_opt_in", status: 403 };
  }

  if (!testeControlado && consentimento?.opt_out) {
    await registrarEnvio({
      usuarioId: params.usuarioId,
      telefone,
      template,
      status: "bloqueado_opt_out",
      erroCodigo: "opt_out",
    });
    await registrarEventoAdmin("whatsapp_envio_bloqueado", {
      payload: { motivo: "opt_out", template },
    });
    return { ok: false, erro: "opt_out", status: 403 };
  }

  if (params.dryRun) {
    await registrarEnvio({
      usuarioId: params.usuarioId,
      telefone,
      template,
      status: "dry_run",
      payload: { variaveis_count: variaveis.length, teste: Boolean(params.teste) },
    });
    await registrarEventoAdmin("whatsapp_envio_solicitado", {
      payload: { template, dry_run: true, teste: Boolean(params.teste) },
    });
    return { ok: true, status: 200, modo: "dry_run", telefoneMascarado: mascararTelefone(telefone) };
  }

  const phoneNumberId = limparEnvHermes(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const accessToken = limparEnvHermes(process.env.WHATSAPP_ACCESS_TOKEN);
  const graphVersion = limparEnvHermes(process.env.WHATSAPP_GRAPH_API_VERSION) ?? "v23.0";
  if (!phoneNumberId || !accessToken) {
    await registrarEnvio({
      usuarioId: params.usuarioId,
      telefone,
      template,
      status: "provider_nao_configurado",
      erroCodigo: "provider_not_configured",
      payload: { teste: Boolean(params.teste) },
    });
    await registrarEventoAdmin("whatsapp_envio_bloqueado", {
      severidade: "warn",
      payload: { motivo: "provider_not_configured", template },
    });
    return { ok: false, erro: "provider_not_configured", status: 503 };
  }

  const payload = {
    ...montarTemplatePayload(template, variaveis),
    to: telefone.replace(/^\+/, ""),
  };

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json().catch(() => ({}));
  const messageId =
    Array.isArray(data?.messages) && typeof data.messages[0]?.id === "string"
      ? data.messages[0].id
      : null;

  await registrarEnvio({
    usuarioId: params.usuarioId,
    telefone,
    template,
    status: response.ok ? "enviado" : "falha",
    providerMessageId: messageId,
    erroCodigo: response.ok ? null : String(data?.error?.code ?? response.status),
    payload: {
      provider_status: response.status,
      variaveis_count: variaveis.length,
      teste: Boolean(params.teste),
    },
  });

  await registrarEventoAdmin(response.ok ? "whatsapp_envio_solicitado" : "whatsapp_envio_bloqueado", {
    severidade: response.ok ? "info" : "warn",
    payload: {
      template,
      provider_status: response.status,
      provider_message_id: messageId,
    },
  });

  return response.ok
    ? { ok: true, status: 200, providerMessageId: messageId, telefoneMascarado: mascararTelefone(telefone) }
    : { ok: false, status: response.status, erro: "provider_error" };
}
