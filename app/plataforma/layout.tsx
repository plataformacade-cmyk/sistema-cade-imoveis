import { SiteHeader } from "@/components/publico/site-header";
import { SiteFooter } from "@/components/publico/site-footer";

// Marketplace público: header + footer institucionais (o painel é outro shell).
export default function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
