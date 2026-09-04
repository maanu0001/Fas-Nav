import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { homepageSectionSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

/**
 * Homepage-Sektion bearbeiten.
 * Es werden ausschliesslich strukturierte Felder gespeichert – kein freies HTML,
 * wodurch XSS über das CMS ausgeschlossen ist.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { key } = await params;
    const actor = await requirePermission("manageHomepage");
    const body = await parseBody(request, homepageSectionSchema);

    const before = await prisma.homepageSection.findUnique({
      where: { key },
      select: { id: true, key: true, title: true, isVisible: true, sortOrder: true },
    });
    if (!before) return jsonError("Sektion nicht gefunden.", 404);

    const section = await prisma.homepageSection.update({
      where: { key },
      data: {
        ...(body.eyebrow !== undefined ? { eyebrow: body.eyebrow } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
        ...(body.imageId !== undefined ? { imageId: body.imageId } : {}),
        ...(body.isVisible !== undefined ? { isVisible: body.isVisible } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.data !== undefined ? { data: (body.data ?? undefined) as never } : {}),
      },
      select: {
        id: true,
        key: true,
        title: true,
        subtitle: true,
        eyebrow: true,
        isVisible: true,
        sortOrder: true,
        data: true,
      },
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "homepage.update",
      entity: "HomepageSection",
      entityId: section.id,
      entityLabel: section.key,
      before,
      after: { title: section.title, isVisible: section.isVisible },
    });

    return jsonOk(section);
  } catch (error) {
    return handleApiError(error);
  }
}
