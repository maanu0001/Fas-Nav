import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * Sucht Organisationen für die Zuweisung eines Kontos.
 * Nur Admin und Team, da hier auch nicht veröffentlichte Profile erscheinen.
 */
export async function GET(request: Request) {
  try {
    await requirePermission("manageOrgAccounts");

    const url = new URL(request.url);
    const term = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
    const excludeUserId = url.searchParams.get("excludeUserId");

    if (term.length < 2) return jsonOk({ organizations: [] });

    const organizations = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
        // Bereits zugewiesene Organisationen werden ausgeblendet.
        ...(excludeUserId ? { memberships: { none: { userId: excludeUserId } } } : {}),
      },
      orderBy: { name: "asc" },
      take: 15,
      select: { id: true, name: true, city: true, type: true },
    });

    return jsonOk({ organizations });
  } catch (error) {
    return handleApiError(error);
  }
}
