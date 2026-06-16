import { createClient } from "@/lib/supabase/server";

// Eventos canônicos do Cadê (logs_estruturados).
export type Evento =
  | "login_sucesso"
  | "login_falha"
  | "usuario_criado"
  | "usuario_editado"
  | "papel_atribuido"
  | "papel_removido"
  | "imovel_cadastrado"
  | "imovel_editado"
  | "imovel_arquivado"
  | "negocio_aberto"
  | "negocio_status_mudado"
  | "visita_agendada"
  | "visita_status_mudada"
  | "termos_aceitos"
  | "conta_excluida"
  | "corretor_cadastrado"
  | "interesse_demonstrado"
  | "mensagem_enviada"
  | "proposta_enviada"
  | "proposta_respondida"
  | "documento_enviado"
  | "documento_status_mudado"
  | "contrato_gerado"
  | "contrato_assinado"
  | "comissao_registrada"
  | "erro_nao_capturado";

type Opts = {
  entidadeId?: string;
  payload?: Record<string, unknown>;
  severidade?: "info" | "warn" | "error";
};

/**
 * Registra um evento em logs_estruturados. Nunca lança — logging não pode
 * derrubar a operação principal. Guarda o usuario_id (uuid interno, não e-mail).
 */
export async function registrarEvento(evento: Evento, opts: Opts = {}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("logs_estruturados").insert({
      evento,
      severidade: opts.severidade ?? "info",
      usuario_id: user?.id ?? null,
      entidade_id: opts.entidadeId ?? null,
      payload: opts.payload ?? {},
    });
  } catch {
    // silencioso de propósito
  }
}
