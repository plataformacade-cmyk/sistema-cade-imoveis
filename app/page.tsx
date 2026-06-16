import { redirect } from "next/navigation";

// Home institucional vem na Sprint 3. Por ora, encaminha pro painel
// (o proxy redireciona pro /login se não estiver autenticado).
export default function Home() {
  redirect("/painel");
}
