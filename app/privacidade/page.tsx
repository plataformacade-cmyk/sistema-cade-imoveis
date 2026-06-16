export const metadata = { title: "Política de Privacidade — Cadê Imóveis" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Conteúdo jurídico definitivo a ser fornecido pelo time jurídico (Luiz
        Henrique) — placeholder da Sprint 2.
      </p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          Tratamos seus dados conforme a LGPD. Dados de contato e o endereço
          exato do imóvel ficam restritos até a confirmação de uma visita
          (exposição escalonada).
        </p>
        <p>
          Você pode solicitar a exclusão da sua conta em Configurações; seus
          dados pessoais são anonimizados, respeitando a guarda legal de
          contratos firmados.
        </p>
      </div>
    </main>
  );
}
