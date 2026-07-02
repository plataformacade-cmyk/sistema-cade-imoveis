import { NextResponse } from "next/server";
import { criarDestinoInteresse, criarLoginHref } from "@/lib/auth-redirect";
import { getSessao } from "@/lib/auth";
import { registrarInteresseNoImovel } from "@/lib/interesse";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const imovelId = url.searchParams.get("imovel_id");
  const destinoInteresse = criarDestinoInteresse(imovelId);

  if (!destinoInteresse || !imovelId) {
    return NextResponse.redirect(new URL("/interesse/erro?motivo=invalido", url));
  }

  const sessao = await getSessao();
  if (!sessao) {
    return NextResponse.redirect(new URL(criarLoginHref(destinoInteresse), url));
  }

  const resultado = await registrarInteresseNoImovel(imovelId, sessao);

  if (!resultado.ok) {
    const motivo =
      resultado.erro === "eh_proprietario"
        ? "proprietario"
        : resultado.erro === "imovel_indisponivel" ||
            resultado.erro === "imovel_inexistente"
          ? "indisponivel"
          : "erro";

    return NextResponse.redirect(new URL(`/interesse/erro?motivo=${motivo}`, url));
  }

  return NextResponse.redirect(
    new URL(`/painel/negocios/${resultado.negocioId}`, url),
  );
}
