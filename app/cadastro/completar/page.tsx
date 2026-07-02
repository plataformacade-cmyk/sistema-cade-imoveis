import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { criarDestinoAceiteTermos } from "@/lib/auth-redirect";
import { usuarioTemTermosPendentes } from "@/lib/termos";
import { OnboardingWizard } from "./_wizard";

// Onboarding pós-cadastro: o signup redireciona pra cá automaticamente e o
// usuário passa por um wizard (intenção → preferências → pronto).
export default async function CompletarCadastroPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  if (await usuarioTemTermosPendentes(sessao.user.id, ["comprador"])) {
    redirect(
      criarDestinoAceiteTermos(["comprador"], "/cadastro/completar", "cadastro"),
    );
  }
  const primeiroNome = (sessao.user.nome || "").split(" ")[0] || "tudo certo";
  return <OnboardingWizard primeiroNome={primeiroNome} />;
}
