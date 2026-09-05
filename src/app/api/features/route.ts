import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { featureSchema, sortOrderSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Leistungen der Preisübersicht.
 *
 * Eine Leistung ist zugleich eine Zeile der Vergleichstabelle und der
 * Schlüssel, über den das Abonnement Funktionen freischaltet. Deshalb ist die
 * Verwaltung derselben Berechtigung unterstellt wie die Tarife.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("managePlans");
    const body = await parseBody(request, featureSchema);

    const vorhanden = await prisma.feature.findUnique({ where: { key: body.key } });
    if (vorhanden) return jsonError("Dieser Schlüssel ist bereits vergeben.", 409);

    const feature = await prisma.feature.create({
      data: body,
      select: { id: true, key: true, name: true, sortOrder: true },
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "feature.create",
      entity: "Feature",
      entityId: feature.id,
      entityLabel: feature.name,
      after: { key: feature.key },
    });

    return jsonOk(feature, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Reihenfolge mehrerer Leistungen in einem Zug setzen. */
export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("managePlans");
    const { order } = await parseBody(request, sortOrderSchema);

    await prisma.$transaction(
      order.map((eintrag) =>
        prisma.feature.update({
          where: { id: eintrag.id },
          data: { sortOrder: eintrag.sortOrder },
        }),
      ),
    );

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "feature.reorder",
      entity: "Feature",
      after: { anzahl: order.length },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
