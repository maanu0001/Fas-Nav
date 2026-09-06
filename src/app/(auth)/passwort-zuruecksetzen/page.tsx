import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LoadingState } from "@/components/ui/states";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Passwort zurücksetzen",
  description: "Setze ein neues Passwort für dein Fas-Nav.ch-Konto.",
  path: "/passwort-zuruecksetzen",
  noIndex: true,
  noFollow: true,
});

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Neues Passwort setzen</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Wähle ein sicheres Passwort für dein Konto.
      </p>

      <div className="mt-8">
        <Suspense fallback={<LoadingState />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
