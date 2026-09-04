import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { placementSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Werbeplatzierung buchen (Featured-Einträge, Highlights). */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("managePlacements");
    const body = await parseBody(request, placementSchema);

    const placement = await prisma.placement.create({
      data: body,
      select: { id: true, type: true, status: true, startDate: true, endDate: true },
    });

    // Aktive Platzierungen wirken sich direkt auf die Darstellung aus.
    if (placement.status === "ACTIVE") {
      if (body.organizationId) {
        await prisma.organization.update({
          where: { id: body.organizationId },
          data: { isFeatured: true, featuredUntil: body.endDate },
        });
      }
      if (body.eventId) {
        await prisma.event.update({
          where: { id: body.eventId },
          data: { isFeatured: true, featuredUntil: body.endDate },
        });
      }
    }

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "placement.create",
      entity: "Placement",
      entityId: placement.id,
      entityLabel: placement.type,
      after: placement,
    });

    return jsonOk(placement, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
