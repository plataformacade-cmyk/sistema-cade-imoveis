import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PerfilForm } from "./_components/perfil-form";
import { SenhaForm } from "./_components/senha-form";
import { ExcluirConta } from "./_components/excluir-conta";

export default async function ConfiguracoesPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const supabase = await createClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, telefone, avatar_url")
    .eq("id", sessao.user.id)
    .single();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Sua conta e preferências.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Atualize seu nome, telefone e foto. Seu e-mail é {sessao.user.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm
            usuarioId={sessao.user.id}
            nomeInicial={usuario?.nome ?? ""}
            telefoneInicial={usuario?.telefone ?? ""}
            avatarInicial={usuario?.avatar_url ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senha</CardTitle>
          <CardDescription>
            Escolha uma nova senha com ao menos 8 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SenhaForm />
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de risco</CardTitle>
          <CardDescription>
            Excluir sua conta anonimiza seus dados pessoais (LGPD) e encerra seu
            acesso. Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExcluirConta />
        </CardContent>
      </Card>
    </div>
  );
}
