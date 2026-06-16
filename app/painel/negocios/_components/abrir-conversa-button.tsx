import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { garantirConversa } from "@/actions/mensagens";
import { Button } from "@/components/ui/button";

/**
 * Botão "Abrir conversa" do negócio. Ao submeter, garante que existe uma
 * conversa para o negócio (cria se preciso) e redireciona para a thread.
 */
export function AbrirConversaButton({ negocioId }: { negocioId: string }) {
  async function abrir() {
    "use server";
    const conversaId = await garantirConversa(negocioId);
    if (!conversaId) return;
    redirect(`/painel/mensagens/${conversaId}`);
  }

  return (
    <form action={abrir}>
      <Button type="submit" variant="outline" size="sm">
        <MessageSquare className="size-4" />
        Abrir conversa
      </Button>
    </form>
  );
}
