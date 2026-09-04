import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { AccountForm } from "@/components/dashboard/account-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { MEMBERSHIP_ROLE_LABELS } from "@/lib/constants";
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
          select: {
            id: true,
            role: true,
            title: true,
            organization: { select: { id: true, name: true, type: true } },
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

      <Card className="mt-5 p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Zugeordnete Organisationen</h2>
        {user.memberships.length ? (
          <ul className="divide-y divide-border">
            {user.memberships.map((membership) => (
              <li key={membership.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link
                  href={`/dashboard/organisationen/${membership.organization.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-primary-800 hover:underline"
                >
                  {membership.organization.name}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {MEMBERSHIP_ROLE_LABELS[membership.role]}
                  {membership.title ? ` · ${membership.title}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Diesem Konto ist keine Organisation zugewiesen. Die Zuweisung erfolgt über die
            Organisationsseite.
          </p>
        )}
      </Card>
    </>
  );
}
