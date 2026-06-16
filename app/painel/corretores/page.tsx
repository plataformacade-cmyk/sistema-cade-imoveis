import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogCadastrar,
  type ImobiliariaOpcao,
  type UsuarioOpcao,
} from "./_componentes/dialog-cadastrar";

type CorretorRow = {
  usuario_id: string;
  creci: string | null;
  creci_uf: string | null;
  usuarios: { nome: string | null; email: string | null } | null;
  imobiliarias: { nome: string | null } | null;
};

export default async function CorretoresPage() {
  const sessao = await getSessao();
  const isAdmin = sessao?.isAdmin ?? false;

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Corretores parceiros</h1>
        </div>
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Acesso restrito.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Apenas administradores podem ver os corretores parceiros.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("corretores")
    .select(
      "usuario_id, creci, creci_uf, usuarios(nome, email), imobiliarias(nome)",
    )
    .order("criado_em", { ascending: false });

  const corretores = (data ?? []) as unknown as CorretorRow[];

  // Opções para o dialog de cadastro.
  const [{ data: usuariosData }, { data: imobiliariasData }] =
    await Promise.all([
      supabase
        .from("usuarios")
        .select("id, nome, email")
        .is("anonimizado_em", null)
        .order("nome", { ascending: true }),
      supabase
        .from("imobiliarias")
        .select("id, nome")
        .order("nome", { ascending: true }),
    ]);

  const usuarios = (usuariosData ?? []) as UsuarioOpcao[];
  const imobiliarias = (imobiliariasData ?? []) as ImobiliariaOpcao[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Corretores parceiros</h1>
          <p className="text-muted-foreground text-sm">
            Corretores vinculados à plataforma Cadê Imóveis.
          </p>
        </div>
        <DialogCadastrar usuarios={usuarios} imobiliarias={imobiliarias} />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os corretores. Tente recarregar a página.
        </div>
      ) : corretores.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Nenhum corretor por aqui.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Cadastre o primeiro corretor parceiro para começar.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CRECI</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Imobiliária</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corretores.map((c) => (
                <TableRow key={c.usuario_id}>
                  <TableCell className="font-medium">
                    {c.usuarios?.nome ?? c.usuarios?.email ?? "—"}
                  </TableCell>
                  <TableCell>{c.creci ?? "—"}</TableCell>
                  <TableCell>{c.creci_uf ?? "—"}</TableCell>
                  <TableCell>{c.imobiliarias?.nome ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
