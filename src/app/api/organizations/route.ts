import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { uniqueOrganizationSlug } from "@/lib/slug-service";
import { organizationCreateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Neue Organisation anlegen – ausschliesslich Admin und Team. */
export async function POST(request: Request) {
  try {
    const user = await requirePermission("manageOrganizations");
    const body = await parseBody(request, organizationCreateSchema);

    const slug = await uniqueOrganizationSlug(body.name, { preferred: body.slug });

    const organization = await prisma.organization.create({
      data: {
        type: body.type,
        name: body.name,
        slug,
        shortName: body.shortName,
        tagline: body.tagline,
        shortDescription: body.shortDescription,
        description: body.description,
        history: body.history,
        importantInfo: body.importantInfo,
        city: body.city,
        street: body.street,
        zip: body.zip,
        cantonId: body.cantonId,
        municipalityId: body.municipalityId,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        website: body.website,
        bookingEmail: body.bookingEmail,
        startDate: body.startDate,
        endDate: body.endDate,
        foundedYear: body.foundedYear,
        memberCount: body.memberCount,
        repertoire: body.repertoire,
        musicStyle: body.musicStyle,
        metaTitle: body.metaTitle,
        metaDesc: body.metaDesc,
        status: body.status,
        claimStatus: body.claimStatus,
        publishedAt: body.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true, name: true, slug: true, type: true, status: true },
    });

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "organization.create",
      entity: "Organization",
      entityId: organization.id,
      entityLabel: organization.name,
      after: organization,
    });

    return jsonOk(organization, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
