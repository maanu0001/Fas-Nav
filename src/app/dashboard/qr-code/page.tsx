import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { QrPanel } from "@/components/dashboard/qr/qr-panel";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { QR_TARGETS, qrTargetUrl } from "@/lib/qr";
import { hasFeature } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "QR-Code" };

/**
 * QR-Codes der eigenen Organisation.
 *
 * Welche Ziele verfügbar sind, entscheidet das Abonnement. Diese Seite blendet
 * gesperrte Ziele nicht aus, sondern zeigt sie mit Hinweis – so ist erkennbar,
 * was ein grösseres Abonnement zusätzlich bietet. Die verbindliche Prüfung
 * findet ohnehin im Endpunkt statt.
 */
export default async function QrCodePage() {
  const context = await requireOrganizationContext();
  const organization = context.organization;

  const targets = QR_TARGETS.map((target) => ({
    key: target.key,
    label: target.label,
    description: target.description,
    url: qrTargetUrl({ type: organization.type, slug: organization.slug }, target),
    available: target.feature ? hasFeature(context.subscription, target.feature) : true,
  }));

  return (
    <>
      <PageHeader
        title="QR-Code"
        description="Für Plakate, Flyer und Programmhefte. Der Code führt direkt auf deine Seite auf Fas-Nav.ch."
      />

      <Card className="p-5">
        <QrPanel organizationId={organization.id} targets={targets} />
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Die Codes werden bei jedem Abruf aus der Adresse deiner Seite berechnet. Änderst du die
        Adresse deiner Seite, stimmt der Code sofort – bereits gedruckte Codes zeigen dann
        allerdings ins Leere.
      </p>
    </>
  );
}
