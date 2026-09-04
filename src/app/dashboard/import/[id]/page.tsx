import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { ImportActionBadge } from "@/components/dashboard/import/status-badge";
import { RollbackButton } from "@/components/dashboard/import/rollback-button";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  IMPORT_MODE_LABELS,
  PUBLICATION_MODE_LABELS,
  type ImportOptions,
} from "@/lib/import/options";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.importJob.findUnique({
    where: { id },
    select: { reference: true },
  });
  return { title: job?.reference ?? "Importlauf" };
}

export default async function ImportJobPage({ params }: Params) {
  const { id } = await params;
  await requirePermissionPage("importData");

  const job = await prisma.importJob.findUnique({
    where: { id },
    include: {
      records: {
        orderBy: [{ action: "asc" }, { name: "asc" }],
        take: 500,
        select: {
          id: true,
          action: true,
          importId: true,
          name: true,
          type: true,
          canton: true,
          locality: true,
          confidenceScore: true,
          message: true,
          createdByThisJob: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!job) notFound();

  const options = (job.options ?? null) as ImportOptions | null;
  const canRollback =
    !job.dryRun &&
    job.status !== "ROLLED_BACK" &&
    (job.status === "COMPLETED" || job.status === "COMPLETED_WITH_ERRORS");

  return (
    <>
      <PageHeader
        title={job.reference}
        description={`${job.filename} · ${formatDateTime(job.startedAt)}${
          job.importedByLabel ? ` · ${job.importedByLabel}` : ""
        }`}
        breadcrumbs={[
          { href: "/dashboard/import", label: "Datenimport" },
          { label: job.reference },
        ]}
        actions={canRollback ? <RollbackButton jobId={job.id} /> : undefined}
      />

      {job.dryRun ? (
        <Alert variant="info" className="mb-6" title="Simulation">
          Dieser Lauf war eine Simulation. Es wurde nichts gespeichert.
        </Alert>
      ) : null}

      {job.status === "ROLLED_BACK" ? (
        <Alert variant="warning" className="mb-6" title="Rückgängig gemacht">
          Dieser Import wurde am {formatDateTime(job.rollbackAt)} zurückgenommen.
        </Alert>
      ) : null}

      {job.errorMessage ? (
        <Alert variant="error" className="mb-6" title="Fehler">
          {job.errorMessage}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-semibold">Ergebnis</h2>
          <dl className="grid gap-4 sm:grid-cols-4">
            {[
              ["Datensätze", job.totalRecords],
              ["Angelegt", job.createdRecords],
              ["Aktualisiert", job.updatedRecords],
              ["Übersprungen", job.skippedRecords],
              ["Mögliche Duplikate", job.duplicateRecords],
              ["Prüfung nötig", job.reviewRecords],
              ["Ungültig", job.invalidRecords],
              ["Fehlgeschlagen", job.failedRecords],
              ["Agenda-Einträge", job.eventRecords],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-display text-xl font-bold text-primary-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Einstellungen</h2>
          {options ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Importmodus</dt>
                <dd className="mt-0.5 font-medium">{IMPORT_MODE_LABELS[options.mode]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Veröffentlichung</dt>
                <dd className="mt-0.5 font-medium">
                  {PUBLICATION_MODE_LABELS[options.publicationMode]}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Agenda</dt>
                <dd className="mt-0.5 font-medium">
                  {options.importEvents ? "Termine übernommen" : "Keine Termine"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Angaben gespeichert.</p>
          )}
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold">
          Datensätze ({job.records.length}
          {job.totalRecords > job.records.length ? ` von ${job.totalRecords}` : ""})
        </h2>

        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Status</Th>
                <Th>Name</Th>
                <Th>Typ</Th>
                <Th>Ort</Th>
                <Th>Confidence</Th>
                <Th>Organisation</Th>
                <Th>Hinweis</Th>
              </Tr>
            </Thead>
            <tbody>
              {job.records.map((record) => (
                <Tr key={record.id}>
                  <Td>
                    <ImportActionBadge action={record.action} />
                  </Td>
                  <Td>
                    <p className="font-medium text-primary-900">{record.name}</p>
                    <p className="font-mono text-[0.68rem] text-muted-foreground">
                      {record.importId}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {record.type === "CARNIVAL" ? "Fasnacht" : record.type ? "Gugge" : "–"}
                  </Td>
                  <Td className="text-muted-foreground">
                    {record.locality}
                    {record.canton ? ` · ${record.canton}` : ""}
                  </Td>
                  <Td className="tabular-nums text-muted-foreground">
                    {record.confidenceScore ?? "–"}
                  </Td>
                  <Td>
                    {record.organization ? (
                      <Link
                        href={`/dashboard/organisationen/${record.organization.id}`}
                        className="text-sm text-primary-800 hover:underline"
                      >
                        {record.organization.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                    {record.createdByThisJob ? (
                      <Badge variant="secondary" className="ml-1.5">
                        neu
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="max-w-[280px] text-xs text-muted-foreground">
                    {record.message ?? "–"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </section>
    </>
  );
}
