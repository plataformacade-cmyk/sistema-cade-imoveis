import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { criarLoginHref, resolverAuthNext } from "@/lib/auth-redirect";
import { usuarioTemTelefoneObrigatorio } from "@/lib/telefone";
import { TelefoneObrigatorioForm } from "./telefone-form";

export default async function TelefoneObrigatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = resolverAuthNext(params.next, "/cadastro/completar");
  const sessao = await getSessao();

  if (!sessao) redirect(criarLoginHref(`/cadastro/telefone?next=${encodeURIComponent(next)}`));
  if (await usuarioTemTelefoneObrigatorio(sessao.user.id)) redirect(next);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2 font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-cade.svg" alt="" className="size-7" />
        <span className="tracking-tight">
          Cade<span className="text-primary"> Imoveis</span>
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Confirme seu telefone
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Usaremos esse numero apenas nos fluxos permitidos da plataforma, como
          acompanhamento de interesse, visitas e negociacao. Contato direto so
          acontece com autorizacao e opt-in.
        </p>
      </div>

      <TelefoneObrigatorioForm next={next} />
    </main>
  );
}

