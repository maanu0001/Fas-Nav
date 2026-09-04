"use client";

import { useEffect } from "react";
import { RotateCcw, LayoutDashboard } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";

/** Fängt unerwartete Fehler im Dashboard ab, ohne die Navigation zu verlieren. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] Fehler:", error);
  }, [error]);

  return (
    <>
      <PageHeader title="Etwas ist schiefgelaufen" />
      <ErrorState
        title="Diese Ansicht konnte nicht geladen werden"
        description={
          <>
            Bitte versuche es erneut. Falls das Problem bestehen bleibt, melde dich beim
            Fas-Nav-Team.
            {error.digest ? (
              <span className="mt-2 block font-mono text-xs">Referenz: {error.digest}</span>
            ) : null}
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset}>
              <RotateCcw />
              Erneut versuchen
            </Button>
            <ButtonLink href="/dashboard" variant="outline">
              <LayoutDashboard />
              Zum Dashboard
            </ButtonLink>
          </div>
        }
      />
    </>
  );
}
