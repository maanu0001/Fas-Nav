import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Kein Zugriff" };

export default function NoAccessPage() {
  return (
    <>
      <PageHeader title="Kein Zugriff" />
      <EmptyState
        icon={ShieldAlert}
        title="Für diesen Bereich fehlt dir die Berechtigung"
        description="Dieser Bereich ist dem Fas-Nav-Team vorbehalten. Wenn du glaubst, dass du Zugriff haben solltest, melde dich bei uns."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/dashboard" variant="primary">
              Zum Dashboard
            </ButtonLink>
            <ButtonLink href="/dashboard/tickets/neu" variant="outline">
              Support kontaktieren
            </ButtonLink>
          </div>
        }
      />
    </>
  );
}
