"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unbehandelter Fehler:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <LogoMark className="h-14 w-14 text-2xl" />
      <h1 className="mt-8 font-display text-2xl font-bold">Es ist ein Fehler aufgetreten</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Beim Laden dieser Seite ist etwas schiefgelaufen. Versuche es bitte erneut – falls das
        Problem bestehen bleibt, melde dich bei uns.
      </p>

      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-muted-foreground">Referenz: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} size="lg">
          <RotateCcw />
          Erneut versuchen
        </Button>
        <ButtonLink href="/" variant="outline" size="lg">
          <Home />
          Zur Startseite
        </ButtonLink>
      </div>
    </div>
  );
}
