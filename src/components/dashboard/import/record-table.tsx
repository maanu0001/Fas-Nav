"use client";

import * as React from "react";
import { ChevronDown, Search, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import {
  ACTIVITY_LABELS,
  ActivityBadge,
  ConfidenceBadge,
  IMPORT_ACTION_LABELS,
  ImportActionBadge,
} from "@/components/dashboard/import/status-badge";
import type { AnalysedRecord } from "@/components/dashboard/import/types";
import { CANTONS } from "@/lib/constants";
import { FIELD_LABELS } from "@/lib/import/mapping";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

/** Tabelle aller erkannten Datensätze mit Filtern und Detailausklappung. */
export function ImportRecordTable({ records }: { records: AnalysedRecord[] }) {
  const [term, setTerm] = React.useState("");
  const [action, setAction] = React.useState("");
  const [type, setType] = React.useState("");
  const [canton, setCanton] = React.useState("");
  const [activity, setActivity] = React.useState("");
  const [confidence, setConfidence] = React.useState("");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const search = term.trim().toLowerCase();
    return records.filter((record) => {
      if (action && record.action !== action) return false;
      if (type && record.type !== type) return false;
      if (canton && record.cantonCode !== canton) return false;
      if (activity && (record.activityStatus ?? "") !== activity) return false;
      if (confidence) {
        const score = record.confidenceScore ?? -1;
        if (confidence === "high" && score < 80) return false;
        if (confidence === "medium" && (score < 70 || score >= 80)) return false;
        if (confidence === "low" && score >= 70) return false;
      }
      if (search) {
        const haystack = `${record.name} ${record.city} ${record.importId}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [records, term, action, type, canton, activity, confidence]);

  React.useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [term, action, type, canton, activity, confidence]);

  const shown = filtered.slice(0, visible);
  const cantonOptions = React.useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.cantonCode).filter(Boolean))).sort(),
    [records],
  );

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="relative block lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Suche</span>
          <Search
            className="pointer-events-none absolute left-3 top-[2.15rem] h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, Ort oder Kennung …"
            className="pl-9"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Alle</option>
            {Object.entries(IMPORT_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Typ</span>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Alle</option>
            <option value="CARNIVAL">Fasnacht</option>
            <option value="GUGGE">Gugge</option>
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Kanton</span>
          <Select value={canton} onChange={(e) => setCanton(e.target.value)}>
            <option value="">Alle</option>
            {cantonOptions.map((code) => (
              <option key={code} value={code}>
                {CANTONS.find((c) => c.code === code)?.name ?? code}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Aktivität</span>
          <Select value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="">Alle</option>
            {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Confidence</span>
          <Select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
            <option value="">Alle</option>
            <option value="high">80 und mehr</option>
            <option value="medium">70 bis 79</option>
            <option value="low">unter 70</option>
          </Select>
        </label>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {filtered.length} von {records.length} Datensätzen
      </p>

      {shown.length ? (
        <>
          <TableWrapper>
            <Table>
              <Thead>
                <Tr>
                  <Th>Status</Th>
                  <Th>Name</Th>
                  <Th>Typ</Th>
                  <Th>Ort</Th>
                  <Th>Kanton</Th>
                  <Th>Confidence</Th>
                  <Th>Aktivität</Th>
                  <Th>Bestehender Datensatz</Th>
                  <Th>Aktion</Th>
                </Tr>
              </Thead>
              <tbody>
                {shown.map((record) => {
                  const open = expanded === record.importId;
                  const hasDetails =
                    record.errors.length > 0 ||
                    record.protectedFields.length > 0 ||
                    record.changedFields.length > 0 ||
                    Boolean(record.plannedEvent);

                  return (
                    <React.Fragment key={record.importId}>
                      <Tr>
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
                          {record.type === "CARNIVAL" ? "Fasnacht" : "Gugge"}
                        </Td>
                        <Td className="text-muted-foreground">{record.city}</Td>
                        <Td className="text-muted-foreground">{record.cantonCode}</Td>
                        <Td>
                          <ConfidenceBadge score={record.confidenceScore} />
                        </Td>
                        <Td>
                          <ActivityBadge status={record.activityStatus} />
                        </Td>
                        <Td className="text-muted-foreground">
                          {record.existingLabel ? (
                            <span className="text-xs">{record.existingLabel}</span>
                          ) : (
                            <span className="text-xs">–</span>
                          )}
                        </Td>
                        <Td>
                          {hasDetails ? (
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : record.importId)}
                              aria-expanded={open}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                            >
                              Details
                              <ChevronDown
                                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                                aria-hidden
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </Td>
                      </Tr>

                      {open ? (
                        <tr className="border-t border-border bg-muted/40">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="space-y-3 text-sm">
                              {record.message ? (
                                <p className="text-slate-700">{record.message}</p>
                              ) : null}

                              {record.errors.length ? (
                                <div>
                                  <p className="font-medium text-red-900">Fehler</p>
                                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-red-800">
                                    {record.errors.map((error, i) => (
                                      <li key={i}>{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {record.protectedFields.length ? (
                                <div>
                                  <p className="flex items-center gap-1.5 font-medium text-amber-900">
                                    <ShieldAlert className="h-4 w-4" aria-hidden />
                                    Manuell bearbeitet – wird nicht überschrieben
                                  </p>
                                  <ul className="mt-2 space-y-2">
                                    {record.protectedFields.map((conflict) => (
                                      <li
                                        key={conflict.field}
                                        className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                                      >
                                        <p className="text-xs font-semibold text-amber-900">
                                          {FIELD_LABELS[conflict.field] ?? conflict.field}
                                        </p>
                                        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                          <div>
                                            <p className="text-[0.68rem] uppercase tracking-wide text-amber-700">
                                              Aktueller Wert
                                            </p>
                                            <p className="break-words text-xs text-slate-800">
                                              {formatValue(conflict.currentValue)}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[0.68rem] uppercase tracking-wide text-amber-700">
                                              Importwert
                                            </p>
                                            <p className="break-words text-xs text-slate-800">
                                              {formatValue(conflict.importValue)}
                                            </p>
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {record.changedFields.length ? (
                                <div>
                                  <p className="font-medium text-slate-700">
                                    Wird geschrieben ({record.changedFields.length})
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {record.changedFields.map((field) => (
                                      <Badge key={field} variant="secondary">
                                        {FIELD_LABELS[field] ?? field}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {record.plannedEvent ? (
                                <p className="text-slate-700">
                                  Agenda-Eintrag:{" "}
                                  <span className="font-medium">{record.plannedEvent.title}</span> am{" "}
                                  {new Date(record.plannedEvent.startDate).toLocaleDateString("de-CH")}
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          </TableWrapper>

          {visible < filtered.length ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Weitere {Math.min(PAGE_SIZE, filtered.length - visible)} anzeigen
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Keine Datensätze für diese Filter"
          description="Passe die Auswahl an, um weitere Einträge zu sehen."
        />
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "boolean") return value ? "ja" : "nein";
  const text = String(value);
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}
