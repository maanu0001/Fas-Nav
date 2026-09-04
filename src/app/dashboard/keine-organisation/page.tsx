import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Keine Organisation" };

export default function NoOrganizationPage() {
  return (
    <>
      <PageHeader title="Keine Organisation zugewiesen" />
      <EmptyState
        icon={Building2}
        title="Deinem Konto ist noch keine Organisation zugeordnet"
        description="Damit du eine Seite bearbeiten kannst, muss dein Konto mit deiner Fasnacht oder Gugge verknüpft werden. Das Fas-Nav-Team erledigt das gerne für dich."
        action={
          <ButtonLink href="/dashboard/tickets/neu" variant="primary">
            Support kontaktieren
          </ButtonLink>
        }
      />
    </>
  );
}
