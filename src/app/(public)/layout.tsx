import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isAuthenticated={Boolean(session?.user)} />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
