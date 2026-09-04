import Link from "next/link";
import { ExternalLink, FileSearch, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ActivityBadge,
  ConfidenceBadge,
} from "@/components/dashboard/import/status-badge";
import { formatDateShort } from "@/lib/dates";
import type { ActivityStatus } from "@prisma/client";

export type ResearchData = {
  externalImportId: string | null;
  importSource: string | null;
  importedAt: Date | null;
  confidenceScore: number | null;
  needsManualReview: boolean;
  reviewReasons: string[];
  activityStatus: ActivityStatus | null;
  lastActivityEvidence: string | null;
  lastVerifiedAt: Date | null;
  dataNotes: string | null;
  logoSourceUrl: string | null;
  logoAssetUrl: string | null;
  logoStatus: string | null;
  headerSourceUrl: string | null;
  headerAssetUrl: string | null;
  headerStatus: string | null;
  sources: {
    id: string;
    url: string;
    type: string | null;
    title: string | null;
    accessedAt: Date | null;
  }[];
  lastImportJob: { id: string; reference: string } | null;
};

/**
 * Zeigt Herkunft und Qualität importierter Daten.
 * Ausschliesslich im Adminbereich sichtbar – die öffentliche Seite gibt
 * diese Angaben nicht aus.
 */
export function ResearchPanel({
  data,
  /**
   * Nur die Administration darf Importläufe öffnen. Ohne diese Berechtigung
   * wird die Referenz als reiner Text ausgegeben, damit kein Verweis ins
   * Leere führt. Die Recherchedaten selbst gehören zur Organisation und
   * bleiben für das Team sichtbar.
   */
  canOpenImportJob = false,
}: {
  data: ResearchData;
  canOpenImportJob?: boolean;
}) {
  const isImported = Boolean(data.externalImportId);
  if (!isImported && data.sources.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <FileSearch className="h-4 w-4 text-primary-700" aria-hidden />
        Recherchedaten
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Herkunft und Qualität der importierten Angaben. Diese Informationen sind nur intern
        sichtbar.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Import-Kennung</dt>
          <dd className="mt-0.5 break-all font-mono text-xs">
            {data.externalImportId ?? "–"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Confidence</dt>
          <dd className="mt-0.5">
            <ConfidenceBadge score={data.confidenceScore} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Aktivität</dt>
          <dd className="mt-0.5">
            <ActivityBadge status={data.activityStatus} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Zuletzt geprüft</dt>
          <dd className="mt-0.5 text-sm">
            {data.lastVerifiedAt ? formatDateShort(data.lastVerifiedAt) : "–"}
          </dd>
        </div>
      </dl>

      {data.needsManualReview ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Manuelle Prüfung angefordert</p>
          {data.reviewReasons.length ? (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
              {data.reviewReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {data.dataNotes ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="h-3.5 w-3.5" aria-hidden />
            Hinweise aus der Recherche
          </p>
          <p className="mt-1.5 text-sm text-slate-700">{data.dataNotes}</p>
        </div>
      ) : null}

      {data.lastActivityEvidence ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Beleg für Aktivität
          </p>
          <p className="mt-1 text-sm text-slate-700">{data.lastActivityEvidence}</p>
        </div>
      ) : null}

      {data.logoSourceUrl || data.logoAssetUrl || data.headerSourceUrl ? (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vorgeschlagene Bilder
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Dateien werden bewusst nicht automatisch übernommen. Prüfe die Rechte, bevor du ein
            Bild im Editor hochlädst.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              ["Logo", data.logoAssetUrl ?? data.logoSourceUrl, data.logoStatus],
              ["Titelbild", data.headerAssetUrl ?? data.headerSourceUrl, data.headerStatus],
            ]
              .filter(([, url]) => Boolean(url))
              .map(([label, url, status]) => (
                <li key={String(label)} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">{label}:</span>
                  <a
                    href={String(url)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 break-all text-primary-700 hover:underline"
                  >
                    {String(url).slice(0, 80)}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  </a>
                  {status ? <Badge variant="secondary">{String(status)}</Badge> : null}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {data.sources.length ? (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recherchequellen ({data.sources.length})
          </p>
          <ul className="space-y-2">
            {data.sources.map((source) => (
              <li key={source.id} className="rounded-lg border border-border p-3">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-start gap-1.5 text-sm font-medium text-primary-800 hover:underline"
                >
                  <span className="break-all">{source.title ?? source.url}</span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                </a>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {source.type ? <span>{source.type}</span> : null}
                  {source.accessedAt ? (
                    <span>abgerufen am {formatDateShort(source.accessedAt)}</span>
                  ) : null}
                  {source.title ? <span className="break-all">{source.url}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.lastImportJob ? (
        <p className="mt-5 text-xs text-muted-foreground">
          Zuletzt aktualisiert durch{" "}
          {canOpenImportJob ? (
            <Link
              href={`/dashboard/import/${data.lastImportJob.id}`}
              className="font-mono text-primary-700 hover:underline"
            >
              {data.lastImportJob.reference}
            </Link>
          ) : (
            <span className="font-mono">{data.lastImportJob.reference}</span>
          )}
          {data.importedAt ? ` am ${formatDateShort(data.importedAt)}` : ""}
        </p>
      ) : null}
    </Card>
  );
}
