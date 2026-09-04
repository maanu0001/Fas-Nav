import type { Metadata } from "next";
import Link from "next/link";
import { FileJson } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";
import { ImportWizard } from "@/components/dashboard/import/import-wizard";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { ImportJobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Datenimport" };

const STATUS_LABELS: Record<ImportJobStatus, string> = {
  DRY_RUN: "Simulation",
  RUNNING: "Läuft",
  COMPLETED: "Abgeschlossen",
  COMPLETED_WITH_ERRORS: "Mit Fehlern abgeschlossen",
  FAILED: "Fehlgeschlagen",
  ROLLED_BACK: "Rückgängig gemacht",
};

const STATUS_VARIANTS: Record<ImportJobStatus, "success" | "info" | "warning" | "destructive" | "muted"> = {
  DRY_RUN: "info",
  RUNNING: "info",
  COMPLETED: "success",
  COMPLETED_WITH_ERRORS: "warning",
  FAILED: "destructive",
  ROLLED_BACK: "muted",
};

export default async function ImportPage() {
  // Nur Admin und Team; Organisationskonten werden umgeleitet.
  await requirePermissionPage("importData");

  const jobs = await prisma.importJob.findMany({
    orderBy: { startedAt: "desc" },
    take: 25,
    select: {
      id: true,
      reference: true,
      filename: true,
      status: true,
      dryRun: true,
      startedAt: true,
      totalRecords: true,
      createdRecords: true,
      updatedRecords: true,
      failedRecords: true,
      importedByLabel: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Datenimport"
        description="Recherchierte Fasnachten und Guggen aus einer JSON-Datei übernehmen. Die Datei wird zuerst geprüft; der Import startet erst nach ausdrücklicher Bestätigung."
      />

      <ImportWizard />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold">Bisherige Läufe</h2>

        {jobs.length ? (
          <TableWrapper>
            <Table>
              <Thead>
                <Tr>
                  <Th>Lauf</Th>
                  <Th>Datei</Th>
                  <Th>Zeitpunkt</Th>
                  <Th>Datensätze</Th>
                  <Th>Ergebnis</Th>
                  <Th>Ausgeführt von</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <tbody>
                {jobs.map((job) => (
                  <Tr key={job.id}>
                    <Td>
                      <Link
                        href={`/dashboard/import/${job.id}`}
                        className="font-mono text-xs font-medium text-primary-800 hover:underline"
                      >
                        {job.reference}
                      </Link>
                    </Td>
                    <Td className="max-w-[220px] truncate text-muted-foreground" title={job.filename}>
                      {job.filename}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(job.startedAt)}
                    </Td>
                    <Td className="tabular-nums text-muted-foreground">{job.totalRecords}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {job.createdRecords} neu · {job.updatedRecords} aktualisiert
                      {job.failedRecords > 0 ? ` · ${job.failedRecords} Fehler` : ""}
                    </Td>
                    <Td className="max-w-[180px] truncate text-xs text-muted-foreground">
                      {job.importedByLabel ?? "–"}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={STATUS_VARIANTS[job.status]}>
                          {STATUS_LABELS[job.status]}
                        </Badge>
                        {job.dryRun ? <Badge variant="muted">Simulation</Badge> : null}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        ) : (
          <Card className="p-0">
            <EmptyState
              icon={FileJson}
              title="Noch keine Importläufe"
              description="Sobald du eine Recherchedatei importierst oder simulierst, erscheint der Lauf hier."
            />
          </Card>
        )}
      </section>
    </>
  );
}
