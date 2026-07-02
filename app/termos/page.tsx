import { listarTermosAtivos, PERFIL_TERMO_LABEL } from "@/lib/termos";

export const metadata = { title: "Termos de Uso - Cade Imoveis" };

function BlocoConteudo({ conteudo }: { conteudo: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {conteudo.split(/\n{2,}/).map((paragrafo) => (
        <p key={paragrafo}>{paragrafo}</p>
      ))}
    </div>
  );
}

export default async function TermosPage() {
  const termos = await listarTermosAtivos();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Versoes vigentes dos termos por perfil de uso da plataforma.
      </p>

      <div className="mt-8 space-y-6">
        {termos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum termo publicado no momento.
          </p>
        ) : (
          termos.map((termo) => (
            <section key={termo.id} className="border-t pt-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {PERFIL_TERMO_LABEL[termo.perfil]} - versao {termo.versao}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{termo.titulo}</h2>
              <div className="mt-3">
                <BlocoConteudo conteudo={termo.conteudo} />
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
