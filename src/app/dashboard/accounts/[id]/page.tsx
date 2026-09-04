import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountForm } from "@/components/dashboard/account-form";
import { UserOrganizations } from "@/components/dashboard/access/user-organizations";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatDateTime } from "@/lib/dates";
import { requirePermissionPage } from "@/lib/dashboard-context";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user?.name ?? "Account" };
}

export default async function AccountDetailPage({ params }: Params) {
  const { id } = await params;
  const { user: actor } = await requirePermissionPage("manageOrgAccounts");

  const [user, organizations] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            title: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                city: true,
                status: true,
                claimStatus: true,
              },
            },
          },
        },
      },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  if (!user) notFound();

  return (
    <>
      <PageHeader
        title={user.name}
        description={`${user.email} · erstellt am ${formatDateTime(user.createdAt)}${
          user.lastLoginAt ? ` · zuletzt angemeldet ${formatDateTime(user.lastLoginAt)}` : ""
        }`}
        breadcrumbs={[{ href: "/dashboard/accounts", label: "Accounts" }, { label: user.name }]}
      />

      <AccountForm
        userId={user.id}
        organizations={organizations}
        canManageStaff={can(actor.role as Role, "manageStaffAccounts")}
        initial={{
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone ?? "",
          isActive: user.isActive,
        }}
      />

      <div className="mt-5">
        <UserOrganizations
          userId={user.id}
          userName={user.name}
          memberships={user.memberships.map((m) => ({
            id: m.id,
            role: m.role,
            title: m.title,
            createdAt: m.createdAt.toISOString(),
            organization: m.organization,
          }))}
        />
      </div>
    </>
  );
}
