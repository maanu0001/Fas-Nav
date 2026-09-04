import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <LogoMark className="h-14 w-14 text-2xl" />
      <p className="mt-8 font-display text-5xl font-extrabold text-primary-900">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">Diese Seite gibt es nicht</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Vielleicht wurde der Eintrag entfernt, ist noch nicht veröffentlicht oder die Adresse hat
        sich geändert.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          <Home />
          Zur Startseite
        </ButtonLink>
        <ButtonLink href="/agenda" variant="outline" size="lg">
          <Compass />
          Agenda öffnen
        </ButtonLink>
        <ButtonLink href="/suche" variant="ghost" size="lg">
          <Search />
          Suchen
        </ButtonLink>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Etwas stimmt nicht?{" "}
        <Link href="/kontakt" className="font-medium text-primary-700 hover:underline">
          Melde es uns
        </Link>
        .
      </p>
    </div>
  );
}
