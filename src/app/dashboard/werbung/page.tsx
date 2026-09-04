import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { PlacementManager } from "@/components/dashboard/placement-manager";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Werbung" };

export default async function PlacementsPage() {
  await requirePermissionPage("managePlacements");

  const [placements, organizations, events] = await Promise.all([
    prisma.placement.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        priceChf: true,
        cantonSlug: true,
        organization: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.event.findMany({
      where: { startDate: { gte: new Date() } },
      select: { id: true, title: true },
      orderBy: { startDate: "asc" },
      take: 200,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Werbung und Platzierungen"
        description="Hervorhebungen auf der Startseite, in der Agenda und auf Kantonsseiten."
      />

      <PlacementManager
        placements={placements.map((p) => ({
          ...p,
          priceChf: p.priceChf !== null ? Number(p.priceChf) : null,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
        }))}
        organizations={organizations}
        events={events}
      />
    </>
  );
}
