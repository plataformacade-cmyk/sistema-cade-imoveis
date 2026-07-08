import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  criarDestinoAceiteTermos,
  criarDestinoTelefone,
  criarLoginHref,
} from "@/lib/auth-redirect";
import { usuarioTemTermosPendentes } from "@/lib/termos";
import { usuarioTemTelefoneObrigatorio } from "@/lib/telefone";
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
  if (!(await usuarioTemTelefoneObrigatorio(sessao.user.id))) {
    redirect(criarDestinoTelefone(destinoAposTermos, "cadastro"));
  }

  const primeiroNome = (sessao.user.nome || "").split(" ")[0] || "tudo certo";
  return (
    <OnboardingWizard
      primeiroNome={primeiroNome}
      intencaoInicial={intencaoInicial}
    />
  );
}
