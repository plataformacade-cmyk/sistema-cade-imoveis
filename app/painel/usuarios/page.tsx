import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DialogConvidar } from "./_componentes/dialog-convidar";
import { DialogEditar } from "./_componentes/dialog-editar";
import { FiltroStatus } from "./_componentes/filtro-status";

type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
};

const STATUS_VALIDOS = ["ativo", "inativo", "convidado"];

const BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  ativo: { label: "Ativo", variant: "default" },
  inativo: { label: "Inativo", variant: "outline" },
  convidado: { label: "Convidado", variant: "secondary" },
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filtroStatus =
    sp.status && STATUS_VALIDOS.includes(sp.status) ? sp.status : "";

  const sessao = await getSessao();
  const isAdmin = sessao?.isAdmin ?? false;

  const supabase = await createClient();
  let query = supabase
    .from("usuarios")
    .select("id, nome, email, telefone, status")
    .order("criado_em", { ascending: false });

  if (filtroStatus) query = query.eq("status", filtroStatus);

  const { data, error } = await query;
  const usuarios = (data ?? []) as Usuario[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? "Gerencie quem tem acesso ao Cadê Imóveis."
              : "Seus dados de acesso."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiltroStatus atual={filtroStatus} />
          {isAdmin && <DialogConvidar />}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os usuários. Tente recarregar a página.
        </div>
      ) : usuarios.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Nenhum usuário por aqui.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {filtroStatus
              ? "Nenhum usuário com esse status."
              : isAdmin
                ? "Convide alguém para começar."
                : "Nada para mostrar."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-0 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => {
                const badge = BADGE[u.status ?? ""] ?? {
                  label: u.status ?? "—",
                  variant: "outline" as const,
                };
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.nome ?? "—"}
                    </TableCell>
                    <TableCell>{u.email ?? "—"}</TableCell>
                    <TableCell>{u.telefone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <DialogEditar usuario={u} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
