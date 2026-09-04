import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Passwort vergessen",
  description: "Setze dein Passwort für Fas-Nav.ch zurück.",
  path: "/passwort-vergessen",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Passwort vergessen</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary-700 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
