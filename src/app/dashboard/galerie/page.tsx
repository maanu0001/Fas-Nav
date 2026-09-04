import type { Metadata } from "next";

import { GalleryManager } from "@/components/dashboard/gallery-manager";
import { PageHeader } from "@/components/dashboard/page-header";
import { FEATURE_KEYS } from "@/lib/constants";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { featureAccess } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Galerie" };

export default async function GalleryPage() {
  const context = await requireOrganizationContext();

  const media = await prisma.media.findMany({
    where: { organizationId: context.organization.id, type: "GALLERY" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, thumbnailUrl: true, alt: true, caption: true },
  });

  const access = featureAccess(context.subscription, FEATURE_KEYS.GALLERY);

  return (
    <>
      <PageHeader
        title="Galerie"
        description="Bilder für deine öffentliche Seite. Erlaubt sind PNG, JPG und WebP."
      />

      <GalleryManager
        organizationId={context.organization.id}
        initial={media}
        limit={access.limit}
        enabled={access.enabled}
      />
    </>
  );
}
