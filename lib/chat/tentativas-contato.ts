import { createClient } from "@/lib/supabase/server";
import { registrarEvento } from "@/lib/log";
import type { MotivoContatoExterno } from "./contato";

type RegistrarTentativaContatoParams = {
  conversaId?: string | null;
  negocioId: string;
  usuarioId: string;
  entidadeTipo: "mensagem" | "proposta" | "visita";
  motivos: MotivoContatoExterno[];
  textoMascarado: string;
  origem?: "server_action" | "db_trigger";
};

export async function registrarTentativaContato({
  conversaId,
  negocioId,
  usuarioId,
  entidadeTipo,
  motivos,
  textoMascarado,
  origem = "server_action",
}: RegistrarTentativaContatoParams) {
  try {
    const supabase = await createClient();
    await supabase.from("chat_tentativas_contato").insert({
      conversa_id: conversaId ?? null,
      negocio_id: negocioId,
      usuario_id: usuarioId,
      entidade_tipo: entidadeTipo,
      motivos,
      texto_mascarado: textoMascarado,
      origem,
    });

    await registrarEvento("mensagem_contato_bloqueado", {
      entidadeId: negocioId,
      severidade: "warn",
      payload: {
        conversa_id: conversaId ?? null,
        entidade_tipo: entidadeTipo,
        motivos,
        origem,
      },
    });
  } catch {
    // O bloqueio nao pode falhar aberto se a trilha de auditoria falhar.
  }
}
