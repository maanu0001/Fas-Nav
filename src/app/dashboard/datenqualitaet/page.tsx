import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { QualityScore } from "@/components/dashboard/quality/quality-score";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import {
  QUALITY_ISSUE_LABELS,
  QUALITY_SORT_LABELS,
  QUALITY_FLAG_LABELS,
  dataQualitySelect,
  detectDuplicates,
  evaluateOrganization,
  matchesIssue,
  qualityBand,
  sortQuality,
  summarise,
  type QualityIssueFilter,
  type QualitySort,
} from "@/lib/data-quality";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateShort } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Datenqualität" };

const PER_PAGE = 25;

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function DataQualityPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionPage("reviewDataQuality");
  const params = await searchParams;

  // Ein einziger Lesezugriff für Kennzahlen, Dublettenprüfung und Liste.
  // Die Bewertung und das Filtern geschehen anschliessend im Speicher; für
  // einige tausend Profile ist das schneller als mehrere Abfragen je Kennzahl.
  const [rows, cantons] = await Promise.all([
    prisma.organization.findMany({
      select: dataQualitySelect,
      orderBy: { name: "asc" },
    }),
    prisma.canton.findMany({ select: { code: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();
  const evaluated = rows.map((row) => evaluateOrganization(row, now));
  detectDuplicates(evaluated, rows);

  const summary = summarise(evaluated);

  // Filter
  const term = (params.q ?? "").trim().toLowerCase();
  const typeFilter = params.typ;
  const cantonFilter = params.kanton;
  const bandFilter = params.qualitaet;
  const issueFilter = params.problem as QualityIssueFilter | undefined;

  const filtered = evaluated.filter((org) => {
    if (typeFilter && org.type !== typeFilter) return false;
    if (cantonFilter && org.canton.code !== cantonFilter) return false;
    if (bandFilter && qualityBand(org.score) !== bandFilter) return false;
    if (issueFilter && !matchesIssue(org, issueFilter)) return false;
    if (term && !`${org.name} ${org.city}`.toLowerCase().includes(term)) return false;
    return true;
  });

  const sort = (params.sortierung as QualitySort) ?? "score-asc";
  const sorted = sortQuality(filtered, sort in QUALITY_SORT_LABELS ? sort : "score-asc");

  const page = Math.max(1, Number(params.page) || 1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const visible = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const buildHref = (target: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
    );
    next.set("page", String(target));
    return `/dashboard/datenqualitaet?${next.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Datenqualität"
        description="Welche Profile unvollständig, veraltet oder womöglich doppelt erfasst sind – und was konkret fehlt."
      />

      <section className="mb-6" aria-label="Kennzahlen">
        <StatGrid>
          <StatCard
            label="Geprüfte Organisationen"
            value={summary.total}
            hint={`Ø ${summary.averageScore} % vollständig`}
            icon="building"
          />
          <StatCard
            label="Sehr gut gepflegt"
            value={summary.good}
            hint="80 % und mehr"
            icon="chart"
            tone="success"
          />
          <StatCard
            label="Unvollständig"
            value={summary.incomplete}
            hint="unter 60 %"
            icon="layout"
            tone={summary.incomplete > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Mögliche Dubletten"
            value={summary.possibleDuplicates}
            hint="nur Hinweis, nichts wird verändert"
            icon="users"
            tone={summary.possibleDuplicates > 0 ? "warning" : "default"}
          />
        </StatGrid>
      </section>

      <section className="mb-8" aria-label="Fehlende Angaben">
        <StatGrid>
          <StatCard label="Ohne Logo" value={summary.withoutLogo} icon="image" />
          <StatCard label="Ohne Titelbild" value={summary.withoutHeader} icon="image" />
          <StatCard label="Ohne Website" value={summary.withoutWebsite} icon="layout" />
          <StatCard label="Ohne Kontakt" value={summary.withoutContact} icon="users" />
          <StatCard label="Ohne Beschreibung" value={summary.withoutDescription} icon="scroll" />
          <StatCard label="Ohne Social Media" value={summary.withoutSocial} icon="users" />
          <StatCard
            label="Fasnachten ohne kommende Ausgabe"
            value={summary.carnivalsWithoutUpcoming}
            icon="calendar"
          />
          <StatCard
            label="Lange nicht überprüft"
            value={summary.staleVerification}
            icon="badge"
            tone={summary.staleVerification > 0 ? "warning" : "default"}
          />
        </StatGrid>
      </section>

      <DashboardFilters
        searchPlaceholder="Name oder Ort suchen …"
        filters={[
          {
            name: "typ",
            label: "Typ",
            options: [
              { value: "CARNIVAL", label: "Fasnacht" },
              { value: "GUGGE", label: "Gugge" },
            ],
            placeholder: "Alle Typen",
          },
          {
            name: "kanton",
            label: "Kanton",
            options: cantons.map((c) => ({ value: c.code, label: c.name })),
            placeholder: "Alle Kantone",
          },
          {
            name: "qualitaet",
            label: "Qualität",
            options: [
              { value: "poor", label: "Unter 60 %" },
              { value: "medium", label: "60 – 79 %" },
              { value: "good", label: "80 % und mehr" },
            ],
            placeholder: "Alle Bereiche",
          },
          {
            name: "problem",
            label: "Problem",
            options: Object.entries(QUALITY_ISSUE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
            placeholder: "Alle Probleme",
          },
          {
            name: "sortierung",
            label: "Sortierung",
            options: Object.entries(QUALITY_SORT_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
            placeholder: "Schlechteste zuerst",
          },
        ]}
      />

      <p className="mb-3 text-sm text-muted-foreground">
        {sorted.length} von {summary.total} Organisationen
      </p>

      {visible.length ? (
        <>
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th>Organisation</Th>
                  <Th>Kanton</Th>
                  <Th>Datenqualität</Th>
                  <Th>Fehlt</Th>
                  <Th>Status</Th>
                  <Th>Zuletzt geprüft</Th>
                  <Th className="text-right">Aktion</Th>
                </tr>
              </Thead>
              <tbody>
                {visible.map((org) => (
                  <Tr key={org.id}>
                    <Td>
                      <Link href={org.href} className="font-medium text-primary-800 hover:underline">
                        {org.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {org.type === "CARNIVAL" ? "Fasnacht" : "Gugge"} · {org.city}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap text-sm">{org.canton.code}</Td>
                    <Td>
                      <QualityScore score={org.score} />
                    </Td>
                    <Td>
                      {org.missing.length ? (
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {org.missing.slice(0, 3).map((m) => (
                            <li key={m.key}>{m.label}</li>
                          ))}
                          {org.missing.length > 3 ? (
                            <li>und {org.missing.length - 3} weitere</li>
                          ) : null}
                        </ul>
                      ) : (
                        <span className="text-xs text-muted-foreground">Vollständig</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {org.verification === "OFFICIAL" || org.verification === "VERIFIED" ? (
                          <Badge variant="success">Verifiziert</Badge>
                        ) : null}
                        {org.flags.map((flag) => (
                          <Badge
                            key={flag}
                            variant={flag === "POSSIBLE_DUPLICATE" ? "warning" : "muted"}
                            title={
                              flag === "POSSIBLE_DUPLICATE"
                                ? org.duplicateOf
                                    .map((d) => `${d.name} (${d.reason})`)
                                    .join(", ")
                                : undefined
                            }
                          >
                            {QUALITY_FLAG_LABELS[flag]}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-sm text-muted-foreground">
                      {org.lastVerifiedAt ? formatDateShort(org.lastVerifiedAt) : "nie"}
                    </Td>
                    <Td className="text-right">
                      <ButtonLink href={org.href} variant="outline" size="sm">
                        Bearbeiten
                      </ButtonLink>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={buildHref}
            className="mt-6"
          />
        </>
      ) : (
        <Card className="p-8">
          <EmptyState
            title="Keine Organisation trifft auf diese Auswahl zu"
            description="Passe die Filter an, um weitere Profile zu sehen."
          />
        </Card>
      )}
    </>
  );
}
