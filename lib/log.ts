import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  | "visita_sugerida"
  | "visita_confirmada"
  | "visita_recusada"
  | "visita_status_mudada"
  | "termos_aceitos"
  | "conta_excluida"
  | "corretor_cadastrado"
  | "interesse_demonstrado"
  | "lead_qualificacao_salva"
  | "lead_qualificacao_notificada"
  | "mensagem_enviada"
  | "mensagem_contato_bloqueado"
  | "proposta_enviada"
  | "proposta_respondida"
  | "documento_enviado"
  | "documento_status_mudado"
  | "vendedor_empresa_declarada"
  | "vendedor_empresa_vinculada"
  | "vendedor_empresa_desvinculada"
  | "servico_juridico_contratado"
  | "servico_juridico_status_mudado"
  | "contato_externo_aceito"
  | "contato_externo_recusado"
  | "contato_externo_liberado"
  | "followup_externo_criado"
  | "followup_externo_respondido"
  | "contrato_gerado"
  | "contrato_assinado"
  | "contrato_status_mudado"
  | "contrato_reprovado"
  | "contrato_validado"
  | "contrato_comprovante_sinal_anexado"
  | "cartorial_fluxo_iniciado"
  | "cartorial_status_mudado"
  | "cartorial_pendencia_criada"
  | "cartorial_pendencia_resolvida"
  | "cartorial_anexo_enviado"
  | "cartorial_concluido"
  | "prestador_cartorial_cadastrado"
  | "prestador_cartorial_status_mudado"
  | "prestador_cartorial_vinculado"
  | "prestador_cartorial_removido"
  | "prestador_cartorial_acao"
  | "suporte_pos_conclusao_criado"
  | "suporte_pos_conclusao_status_mudado"
  | "hermes_contexto_lido"
  | "hermes_contexto_negado"
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

export async function registrarEventoAdmin(evento: Evento, opts: Opts = {}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("logs_estruturados").insert({
      evento,
      severidade: opts.severidade ?? "info",
      usuario_id: null,
      entidade_id: opts.entidadeId ?? null,
      payload: opts.payload ?? {},
    });
  } catch {
    // silencioso de proposito
  }
}
