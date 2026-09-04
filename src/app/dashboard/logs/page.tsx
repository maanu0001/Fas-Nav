import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatDateTime } from "@/lib/dates";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Logs" };

const PER_PAGE = 50;

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function LogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionPage("viewAuditLog");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(params.entity ? { entity: params.entity } : {}),
    ...(params.q
      ? {
          OR: [
            { action: { contains: params.q, mode: "insensitive" } },
            { entityLabel: { contains: params.q, mode: "insensitive" } },
            { userLabel: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [logs, total, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityLabel: true,
        userLabel: true,
        ip: true,
        createdAt: true,
        before: true,
        after: true,
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["entity"], _count: { entity: true } }),
  ]);

  function buildHref(p: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, value);
    }
    query.set("page", String(p));
    return `/dashboard/logs?${query.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Audit-Log"
        description={`${total} protokollierte administrative Aktionen.`}
      />

      <DashboardFilters
        searchPlaceholder="Aktion, Objekt oder Benutzer …"
        filters={[
          {
            name: "entity",
            label: "Objekttyp",
            options: entities.map((e) => ({
              value: e.entity,
              label: `${e.entity} (${e._count.entity})`,
            })),
          },
        ]}
      />

      {logs.length ? (
        <>
          <TableWrapper>
            <Table>
              <Thead>
                <Tr>
                  <Th>Zeitpunkt</Th>
                  <Th>Aktion</Th>
                  <Th>Objekt</Th>
                  <Th>Benutzer</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <tbody>
                {logs.map((log) => (
                  <Tr key={log.id}>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-xs font-medium text-primary-800">
                      {log.action}
                    </Td>
                    <Td>
                      <span className="text-sm">{log.entityLabel ?? "–"}</span>
                      <p className="text-xs text-muted-foreground">{log.entity}</p>
                    </Td>
                    <Td className="break-all text-xs text-muted-foreground">
                      {log.userLabel ?? "System"}
                    </Td>
                    <Td>
                      {log.before || log.after ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary-700">Anzeigen</summary>
                          <pre className="mt-2 max-w-md overflow-x-auto rounded bg-muted p-2 text-[0.7rem] leading-relaxed">
                            {JSON.stringify({ vorher: log.before, nachher: log.after }, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
            buildHref={buildHref}
            className="mt-6"
          />
        </>
      ) : (
        <EmptyState
          icon={ScrollText}
          title="Keine Einträge"
          description="Administrative Aktionen werden hier protokolliert."
        />
      )}
    </>
  );
}
