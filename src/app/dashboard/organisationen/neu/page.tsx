import type { Metadata } from "next";

import { NewOrganizationForm } from "@/components/dashboard/new-organization-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import type { OrganizationType } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Neue Organisation" };

type SearchParams = Promise<{ typ?: string }>;

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissionPage("manageOrganizations");
  const { typ } = await searchParams;

  const cantons = await prisma.canton.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const defaultType: OrganizationType = typ === "GUGGE" ? "GUGGE" : "CARNIVAL";

  return (
    <>
      <PageHeader
        title="Neue Organisation"
        description="Lege eine Fasnacht oder Gugge an. Weitere Inhalte kannst du danach im Editor ergänzen."
        breadcrumbs={[
          { href: "/dashboard/organisationen", label: "Organisationen" },
          { label: "Neu" },
        ]}
      />

      <NewOrganizationForm cantons={cantons} defaultType={defaultType} />
    </>
  );
}
