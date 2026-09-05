import QRCode from "qrcode";
import { z } from "zod";

import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { findQrTarget, qrFileName, qrTargetUrl } from "@/lib/qr";
import { requireOrganizationAccess } from "@/lib/rbac";
import { getSubscription, hasFeature } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const querySchema = z.object({
  ziel: z.string().max(40).default("profile"),
  format: z.enum(["png", "svg"]).default("png"),
  /** Kantenlänge in Pixeln; grosszügig für den Druck. */
  groesse: z.coerce.number().int().min(256).max(2048).default(1024),
});

/**
 * Liefert den QR-Code einer Organisation.
 *
 * Der Code wird bei jedem Aufruf aus der kanonischen Adresse berechnet. Nichts
 * davon liegt in der Datenbank, und ein geänderter Slug wirkt sofort.
 *
 * Die Prüfung erfolgt vollständig serverseitig und in dieser Reihenfolge:
 * Zugriff auf die Organisation, dann – bei Zielen mit Tarifmerkmal – das
 * Abonnement. Ein ausgeblendeter Knopf ist ausdrücklich nicht die Schutzschicht;
 * ein direkt aufgerufener Endpunkt endet ohne passendes Abonnement mit 403.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams));

    const access = await requireOrganizationAccess(id, "view");

    const organization = await prisma.organization.findUnique({
      where: { id: access.organizationId },
      select: { id: true, slug: true, type: true },
    });
    if (!organization) return jsonError("Organisation nicht gefunden.", 404);

    const target = findQrTarget(query.ziel);
    if (!target) return jsonError("Unbekanntes QR-Ziel.", 400);

    if (target.feature) {
      const subscription = await getSubscription(organization.id);
      if (!hasFeature(subscription, target.feature)) {
        return jsonError(
          "Dieses QR-Ziel ist im aktuellen Abonnement nicht enthalten.",
          403,
        );
      }
    }

    const ziel = qrTargetUrl(organization, target);

    // Fehlerkorrektur "M": guter Ausgleich zwischen Robustheit beim Scannen
    // und Dichte des Musters. Der Rand von vier Modulen entspricht der Norm
    // und ist nötig, damit Lesegeräte den Code sicher finden.
    const gemeinsam = { errorCorrectionLevel: "M" as const, margin: 4 };

    if (query.format === "svg") {
      const svg = await QRCode.toString(ziel, { ...gemeinsam, type: "svg", width: query.groesse });
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${qrFileName(organization.slug, target.key, "svg")}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const png = await QRCode.toBuffer(ziel, { ...gemeinsam, width: query.groesse });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${qrFileName(organization.slug, target.key, "png")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
