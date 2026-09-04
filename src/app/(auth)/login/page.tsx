import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoadingState } from "@/components/ui/states";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Anmelden",
  description: "Melde dich bei Fas-Nav.ch an, um deine Organisation zu verwalten.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Anmelden</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Melde dich an, um deine Fasnacht oder Gugge zu verwalten.
      </p>

      <div className="mt-8">
        <Suspense fallback={<LoadingState />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/organisation-eintragen" className="font-medium text-primary-700 hover:underline">
          Organisation eintragen
        </Link>
      </p>
    </div>
  );
}
