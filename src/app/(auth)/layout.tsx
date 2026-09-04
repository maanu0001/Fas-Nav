import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zur Website
          </Link>
        </div>

        <main id="inhalt" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-foreground">
            AGB
          </Link>
          <span className="ml-auto">© {new Date().getFullYear()} {SITE.name}</span>
        </footer>
      </div>

      {/* Markenfläche – nur auf grossen Bildschirmen sichtbar. */}
      <aside className="relative hidden overflow-hidden bg-hero lg:block" aria-hidden>
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-confetti opacity-70" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <blockquote className="max-w-md">
            <p className="font-display text-3xl font-bold leading-snug">
              Die Schweizer Fasnacht auf einen Blick.
            </p>
            <footer className="mt-5 text-sm leading-relaxed text-slate-300">
              Verwalte deine Fasnacht oder Gugge, veröffentliche Veranstaltungen und erreiche
              Fasnachtsbegeisterte in der ganzen Schweiz.
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
