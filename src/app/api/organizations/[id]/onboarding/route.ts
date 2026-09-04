import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Markiert das geführte Onboarding als abgeschlossen. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await requireOrgAccess(id, { write: true });

    const organization = await prisma.organization.update({
      where: { id },
      data: { onboardingCompleted: true, onboardingStep: 9 },
      select: { id: true, onboardingCompleted: true },
    });

    return jsonOk(organization);
  } catch (error) {
    return handleApiError(error);
  }
}
