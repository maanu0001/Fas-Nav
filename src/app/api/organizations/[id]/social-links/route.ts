import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess } from "@/lib/rbac";
import { httpUrl } from "@/lib/validation/common";
import { socialLinksSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Social-Media-Links werden als komplette Liste ersetzt.
 * Das hält den Editor einfach: ein Speichern-Klick, ein konsistenter Zustand.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireOrgAccess(id, { write: true });
    const body = await parseBody(request, socialLinksSchema);

    const fields: Record<string, string> = {};
    const normalised = body.links.map((link, index) => {
      // Nutzerfreundlich: fehlendes Schema wird ergänzt, danach streng validiert.
      const withScheme = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
      const parsed = httpUrl.safeParse(withScheme);
      if (!parsed.success) {
        fields[`links.${index}.url`] =
          parsed.error.issues[0]?.message ?? "Ungültige URL.";
      }
      return { ...link, url: withScheme, sortOrder: index };
    });

    if (Object.keys(fields).length) {
      return Response.json(
        { error: "Bitte überprüfe die angegebenen Links.", fields },
        { status: 422 },
      );
    }

    // Doppelte Plattformen würden gegen den Unique-Index verstossen.
    const seen = new Set<string>();
    for (const link of normalised) {
      if (seen.has(link.platform)) {
        return Response.json(
          {
            error: "Pro Plattform ist nur ein Link möglich.",
            fields: { _: "Pro Plattform ist nur ein Link möglich." },
          },
          { status: 422 },
        );
      }
      seen.add(link.platform);
    }

    await prisma.$transaction([
      prisma.socialLink.deleteMany({ where: { organizationId: id } }),
      ...(normalised.length
        ? [
            prisma.socialLink.createMany({
              data: normalised.map((link) => ({
                organizationId: id,
                platform: link.platform,
                url: link.url,
                label: link.label,
                sortOrder: link.sortOrder,
              })),
            }),
          ]
        : []),
    ]);

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "organization.social_links.update",
      entity: "Organization",
      entityId: id,
      after: { count: normalised.length },
    });

    const links = await prisma.socialLink.findMany({
      where: { organizationId: id },
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({ links });
  } catch (error) {
    return handleApiError(error);
  }
}
