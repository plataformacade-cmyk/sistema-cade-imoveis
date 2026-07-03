import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { criarDestinoAceiteTermos, criarLoginHref } from "@/lib/auth-redirect";
import { usuarioTemTermosPendentes } from "@/lib/termos";
import { OnboardingWizard } from "./_wizard";

// Onboarding pos-cadastro: o signup redireciona pra ca automaticamente e o
// usuario passa por um wizard (intencao -> preferencias -> pronto).
export default async function CompletarCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ intencao?: string }>;
}) {
  const params = await searchParams;
  const intencaoInicial = params.intencao === "anunciar" ? "anunciar" : null;
  const destinoAposTermos =
    intencaoInicial === "anunciar"
      ? "/cadastro/completar?intencao=anunciar"
      : "/cadastro/completar";

  const sessao = await getSessao();
  if (!sessao) redirect(criarLoginHref(destinoAposTermos));
  if (await usuarioTemTermosPendentes(sessao.user.id, ["comprador"])) {
    redirect(
      criarDestinoAceiteTermos(["comprador"], destinoAposTermos, "cadastro"),
    );
  }

  const primeiroNome = (sessao.user.nome || "").split(" ")[0] || "tudo certo";
  return (
    <OnboardingWizard
      primeiroNome={primeiroNome}
      intencaoInicial={intencaoInicial}
    />
  );
}
