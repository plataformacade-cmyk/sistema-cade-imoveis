export const metadata = { title: "Termos de Uso — Cadê Imóveis" };

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Termos de Uso</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Conteúdo jurídico definitivo a ser fornecido pelo time jurídico (Luiz
        Henrique) — placeholder da Sprint 2.
      </p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          Ao usar a plataforma Cadê Imóveis, você concorda com estes termos. A
          Cadê intermedia o contato entre proprietários, compradores, locatários
          e corretores parceiros.
        </p>
        <p>
          O uso de dados pessoais segue a nossa Política de Privacidade e a LGPD
          (Lei 13.709/2018).
        </p>
      </div>
    </main>
  );
}
