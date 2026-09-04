import type { Metadata } from "next";

import { AccountForm } from "@/components/dashboard/account-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePermissionPage } from "@/lib/dashboard-context";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Neuer Account" };

type SearchParams = Promise<{ organizationId?: string }>;

export default async function NewAccountPage({ searchParams }: { searchParams: SearchParams }) {
  const { user: actor } = await requirePermissionPage("manageOrgAccounts");
  const { organizationId } = await searchParams;

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  return (
    <>
      <PageHeader
        title="Neuer Account"
        description="Erstelle einen Zugang für eine Fasnacht, eine Gugge oder das Fas-Nav-Team."
        breadcrumbs={[{ href: "/dashboard/accounts", label: "Accounts" }, { label: "Neu" }]}
      />

      <AccountForm
        organizations={organizations}
        canManageStaff={can(actor.role as Role, "manageStaffAccounts")}
        defaultOrganizationId={organizationId}
      />
    </>
  );
}
