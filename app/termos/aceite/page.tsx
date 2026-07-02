import Link from "next/link";
import { redirect } from "next/navigation";
import { aceitarTermos } from "@/actions/termos";
import { getSessao } from "@/lib/auth";
import {
  criarDestinoAceiteTermos,
  criarLoginHref,
  normalizarPerfisTermosParam,
  resolverAuthNext,
} from "@/lib/auth-redirect";
import {
  carregarTermosPendentes,
  PERFIL_TERMO_LABEL,
  type PerfilTermo,
} from "@/lib/termos";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Aceite de termos - Cade Imoveis" };

function BlocoConteudo({ conteudo }: { conteudo: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {conteudo.split(/\n{2,}/).map((paragrafo) => (
        <p key={paragrafo}>{paragrafo}</p>
      ))}
    </div>
  );
}

export default async function AceiteTermosPage({
  searchParams,
}: {
  searchParams: Promise<{ perfis?: string; next?: string; origem?: string }>;
}) {
  const params = await searchParams;
  const perfis = normalizarPerfisTermosParam(params.perfis) as PerfilTermo[];
  const next = resolverAuthNext(params.next, "/painel");
  const origem = params.origem?.trim() || "web";

  if (perfis.length === 0) redirect(next);

  const sessao = await getSessao();
  const destinoAtual = criarDestinoAceiteTermos(perfis, next, origem);
  if (!sessao) redirect(criarLoginHref(destinoAtual));

  const pendentes = await carregarTermosPendentes(sessao.user.id, perfis);
  if (pendentes.length === 0) redirect(next);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2 font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-cade.svg" alt="" className="size-7" />
        <span className="tracking-tight">
          Cade<span className="text-primary"> Imoveis</span>
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Aceite os termos para continuar
        </h1>
        <p className="mt-2 text-muted-foreground">
          Estes termos ficam registrados com versao, perfil e data de aceite.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {pendentes.map((termo) => (
          <section key={termo.id} className="rounded-lg border p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {PERFIL_TERMO_LABEL[termo.perfil]} - versao {termo.versao}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{termo.titulo}</h2>
            <div className="mt-3">
              <BlocoConteudo conteudo={termo.conteudo} />
            </div>
          </section>
        ))}
      </div>

      <form action={aceitarTermos} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="perfis" value={perfis.join(",")} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="origem" value={origem} />

        <label className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
          <input
            name="confirmacao"
            value="true"
            required
            type="checkbox"
            className="mt-1"
          />
          <span>
            Li e aceito os termos aplicaveis aos perfis acima. Entendo que
            novas versoes poderao exigir novo aceite.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Aceitar e continuar</Button>
          <Link href="/termos" className="text-sm text-muted-foreground underline">
            Ver pagina publica dos termos
          </Link>
        </div>
      </form>
    </main>
  );
}
