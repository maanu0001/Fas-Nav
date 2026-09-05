import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { syncClaimStatus } from "@/lib/claim-status";
import { OPEN_CLAIM_REQUEST_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { claimRequestUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Bearbeitungsstand einer Übernahmeanfrage setzen.
 *
 * Bewusst wird hier keine Zuordnung zur Organisation angelegt. Dafür gibt es
 * bereits einen Weg: die Zugriffsverwaltung der Organisation. Sobald dort ein
 * Konto Zugriff erhält, setzt syncClaimStatus das Profil auf „beansprucht“.
 * Zwei Wege zum selben Ergebnis wären eine Fehlerquelle, deshalb genehmigt
 * dieser Endpunkt nur die Anfrage und die Oberfläche verweist auf die
 * Zugriffsverwaltung.
 *
 * Umgekehrt ist die Ablehnung mehr als ein Vermerk: Das Profil steht nach
 * einer Anfrage auf CLAIM_REQUESTED und ist damit für weitere Anfragen
 * gesperrt. Bleibt keine offene Anfrage übrig und hat niemand Zugriff, wird es
 * wieder freigegeben – sonst bliebe es dauerhaft blockiert.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("handleContactRequests");
    const { status } = await parseBody(request, claimRequestUpdateSchema);

    const vorher = await prisma.claimRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        organizationId: true,
        contactName: true,
        organization: { select: { name: true } },
      },
    });
    if (!vorher) return jsonError("Anfrage nicht gefunden.", 404);

    const erledigt = status === "APPROVED" || status === "REJECTED";

    const anfrage = await prisma.$transaction(async (tx) => {
      const aktualisiert = await tx.claimRequest.update({
        where: { id },
        data: { status, handledAt: erledigt ? new Date() : null },
        select: { id: true, status: true, handledAt: true },
      });

      if (status === "REJECTED") {
        const weitereOffene = await tx.claimRequest.count({
          where: {
            organizationId: vorher.organizationId,
            id: { not: id },
            status: { in: OPEN_CLAIM_REQUEST_STATUSES },
          },
        });
        // syncClaimStatus setzt auf UNCLAIMED, solange niemand Zugriff hat,
        // und lässt ein bereits übernommenes Profil unangetastet.
        if (weitereOffene === 0) await syncClaimStatus(tx, vorher.organizationId);
      }

      return aktualisiert;
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "claimRequest.status",
      entity: "ClaimRequest",
      entityId: id,
      entityLabel: vorher.organization.name,
      before: { status: vorher.status },
      after: { status: anfrage.status },
    });

    return jsonOk(anfrage);
  } catch (error) {
    return handleApiError(error);
  }
}
