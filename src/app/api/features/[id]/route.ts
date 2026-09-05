import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { featureSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePlans");
    const body = await parseBody(request, featureSchema.partial());

    const vorher = await prisma.feature.findUnique({
      where: { id },
      select: { id: true, key: true, name: true, sortOrder: true },
    });
    if (!vorher) return jsonError("Leistung nicht gefunden.", 404);

    if (body.key && body.key !== vorher.key) {
      const belegt = await prisma.feature.findUnique({ where: { key: body.key } });
      if (belegt) return jsonError("Dieser Schlüssel ist bereits vergeben.", 409);
    }

    const feature = await prisma.feature.update({
      where: { id },
      data: body,
      select: { id: true, key: true, name: true, sortOrder: true },
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "feature.update",
      entity: "Feature",
      entityId: id,
      entityLabel: feature.name,
      before: vorher,
      after: feature,
    });

    return jsonOk(feature);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePlans");

    const feature = await prisma.feature.findUnique({
      where: { id },
      select: { id: true, key: true, name: true, _count: { select: { plans: true } } },
    });
    if (!feature) return jsonError("Leistung nicht gefunden.", 404);

    // Die Zuordnungen verschwinden mit der Leistung (onDelete: Cascade). Das
    // betrifft nur die Darstellung und die Freischaltung, keine Abonnements –
    // deshalb ist das Löschen hier anders als beim Tarif unbedenklich. Der
    // Hinweis auf betroffene Tarife geht trotzdem an den Aufrufer zurück.
    await prisma.feature.delete({ where: { id } });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "feature.delete",
      entity: "Feature",
      entityId: id,
      entityLabel: feature.name,
      before: { key: feature.key, tarife: feature._count.plans },
    });

    return jsonOk({ ok: true, betroffeneTarife: feature._count.plans });
  } catch (error) {
    return handleApiError(error);
  }
}
