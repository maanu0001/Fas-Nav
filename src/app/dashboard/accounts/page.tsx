import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateShort, relativeTime } from "@/lib/dates";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import type { Prisma, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Accounts" };

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function AccountsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user: actor } = await requireStaffPage();
  const params = await searchParams;

  const where: Prisma.UserWhereInput = {
    ...(params.rolle ? { role: params.rolle as Role } : {}),
    ...(params.aktiv === "ja" ? { isActive: true } : params.aktiv === "nein" ? { isActive: false } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { email: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      memberships: {
        select: { organization: { select: { id: true, name: true } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Accounts"
        description={`${users.length} Benutzerkonten.`}
        actions={
          <ButtonLink href="/dashboard/accounts/neu">
            <Plus />
            Account erstellen
          </ButtonLink>
        }
      />

      {!isAdmin(actor.role as Role) ? (
        <p className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Als Team-Account kannst du Organisationsaccounts verwalten. Team- und Adminkonten dürfen
          ausschliesslich Administratoren anlegen oder bearbeiten.
        </p>
      ) : null}

      <DashboardFilters
        searchPlaceholder="Name oder E-Mail …"
        filters={[
          {
            name: "rolle",
            label: "Rolle",
            options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            name: "aktiv",
            label: "Status",
            options: [
              { value: "ja", label: "Aktiv" },
              { value: "nein", label: "Deaktiviert" },
            ],
          },
        ]}
      />

      {users.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Rolle</Th>
                <Th>Organisation</Th>
                <Th>Status</Th>
                <Th>Letzter Login</Th>
                <Th>Erstellt</Th>
              </Tr>
            </Thead>
            <tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <Link
                      href={`/dashboard/accounts/${user.id}`}
                      className="font-medium text-primary-800 hover:underline"
                    >
                      {user.name}
                    </Link>
                    <p className="mt-0.5 break-all text-xs text-muted-foreground">{user.email}</p>
                  </Td>
                  <Td>
                    <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">
                    {user.memberships.length ? (
                      user.memberships.map((m) => (
                        <Link
                          key={m.organization.id}
                          href={`/dashboard/organisationen/${m.organization.id}`}
                          className="block text-sm hover:underline"
                        >
                          {m.organization.name}
                        </Link>
                      ))
                    ) : (
                      <span className="text-sm">–</span>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={user.isActive ? "success" : "muted"}>
                      {user.isActive ? "Aktiv" : "Deaktiviert"}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "nie"}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateShort(user.createdAt)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <EmptyState
          icon={Users}
          title="Keine Accounts gefunden"
          description="Passe die Filter an oder erstelle einen neuen Account."
        />
      )}
    </>
  );
}
