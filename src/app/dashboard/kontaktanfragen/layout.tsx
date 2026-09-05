import { LinkTabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { openContactRequestCounts } from "@/lib/queries/contact-requests";

export const dynamic = "force-dynamic";

/**
 * Rahmen für die beiden Übersichten.
 *
 * Die Prüfung steht hier und zusätzlich in jeder Seite sowie im Endpunkt.
 * Ein Layout allein wäre kein verlässlicher Schutz: Es umschliesst zwar alle
 * Unterseiten, aber ein Endpunkt liegt ausserhalb davon.
 */
export default async function ContactRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermissionPage("handleContactRequests");
  const counts = await openContactRequestCounts();

  return (
    <>
      <PageHeader
        title="Kontaktanfragen"
        description="Zuschriften über die Website – getrennt nach allgemeinem Kontaktformular und Übernahme eines Profils."
      />

      <LinkTabs
        className="mb-6"
        items={[
          {
            href: "/dashboard/kontaktanfragen",
            label: counts.contact
              ? `Kontaktformular (${counts.contact})`
              : "Kontaktformular",
            exact: true,
          },
          {
            href: "/dashboard/kontaktanfragen/profil",
            label: counts.claims
              ? `Profil beanspruchen (${counts.claims})`
              : "Profil beanspruchen",
          },
        ]}
      />

      {children}
    </>
  );
}
