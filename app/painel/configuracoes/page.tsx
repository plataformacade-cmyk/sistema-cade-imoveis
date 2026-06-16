export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Sua conta e preferências.
        </p>
      </div>
      <p className="text-muted-foreground text-sm">
        Em breve: editar perfil, trocar senha, preferências de notificação e
        exclusão de conta (LGPD). — Sprint 2.
      </p>
    </div>
  );
}
