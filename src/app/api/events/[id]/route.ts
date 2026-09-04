import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { notifyOrganization } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStaff, requireOrgAccess } from "@/lib/rbac";
import { uniqueEventSlug } from "@/lib/slug-service";
import { eventUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Lädt die Veranstaltung und prüft den Zugriff über ihre Organisation. */
async function loadEvent(id: string, write: boolean) {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      city: true,
      startDate: true,
      endDate: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });
  if (!event) return null;

  // Die Organisation der Veranstaltung entscheidet über die Berechtigung.
  const access = await requireOrgAccess(event.organizationId, { write });
  return { event, access };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const loaded = await loadEvent(id, true);
    if (!loaded) return jsonError("Veranstaltung nicht gefunden.", 404);

    const { event, access } = loaded;
    const body = await parseBody(request, eventUpdateSchema);

    // Ein Statuswechsel auf SUSPENDED bleibt dem Fas-Nav-Team vorbehalten.
    if (body.status === "SUSPENDED" && !isStaff(access.user.role)) {
      return jsonError("Diesen Status darf nur das Fas-Nav-Team setzen.", 403);
    }
    if (event.status === "SUSPENDED" && !isStaff(access.user.role)) {
      return jsonError(
        "Diese Veranstaltung wurde gesperrt. Bitte kontaktiere das Fas-Nav-Team.",
        403,
      );
    }

    if (body.imageId) {
      const media = await prisma.media.findUnique({
        where: { id: body.imageId },
        select: { organizationId: true },
      });
      if (!media || (media.organizationId && media.organizationId !== event.organizationId)) {
        return jsonError("Das ausgewählte Bild gehört nicht zu dieser Organisation.", 403);
      }
    }

    // Datumsbereich auch bei Teilaktualisierungen konsistent prüfen.
    const nextStart = body.startDate ?? event.startDate;
    const nextEnd = body.endDate !== undefined ? body.endDate : event.endDate;
    if (nextEnd && nextEnd < nextStart) {
      return jsonError("Das Ende muss nach dem Beginn liegen.", 422, {
        endDate: "Das Ende muss nach dem Beginn liegen.",
      });
    }

    const nextSlug =
      body.slug && body.slug !== event.slug
        ? await uniqueEventSlug(event.title, { preferred: body.slug, excludeId: id })
        : undefined;

    const becomesPublished = body.status === "PUBLISHED" && event.status !== "PUBLISHED";

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...body,
        ...(nextSlug ? { slug: nextSlug } : {}),
        ...(becomesPublished ? { publishedAt: new Date() } : {}),
      },
      select: { id: true, title: true, slug: true, status: true, startDate: true, endDate: true },
    });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "event.update",
      entity: "Event",
      entityId: id,
      entityLabel: updated.title,
      before: { status: event.status, title: event.title, slug: event.slug },
      after: updated,
    });

    if (becomesPublished) {
      await notifyOrganization(event.organizationId, {
        type: "EVENT_PUBLISHED",
        title: "Veranstaltung veröffentlicht",
        body: `„${updated.title}“ erscheint jetzt in der Fas-Nav-Agenda.`,
        link: `/event/${updated.slug}`,
      });
    }

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const loaded = await loadEvent(id, true);
    if (!loaded) return jsonError("Veranstaltung nicht gefunden.", 404);

    const { event, access } = loaded;

    await prisma.event.delete({ where: { id } });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "event.delete",
      entity: "Event",
      entityId: id,
      entityLabel: event.title,
      before: { title: event.title, slug: event.slug, organization: event.organization.name },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
