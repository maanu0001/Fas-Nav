"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  FlaskConical,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ImportRecordTable } from "@/components/dashboard/import/record-table";
import type {
  AnalysisResponse,
  RunResponse,
} from "@/components/dashboard/import/types";
import { CANTONS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "configure" | "done";

type Options = {
  mode: "CREATE_ONLY" | "CREATE_AND_UPDATE";
  publicationMode: "SAFE_PUBLISH" | "DRAFT_ONLY";
  importEvents: boolean;
};

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Datei" },
  { id: "preview", label: "Vorschau" },
  { id: "configure", label: "Einstellungen" },
  { id: "done", label: "Ergebnis" },
];

const MAX_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Mehrstufiger Assistent: Datei prüfen, Ergebnis ansehen, Einstellungen
 * wählen, importieren. Der Import startet nie unmittelbar nach dem Upload.
 */
export function ImportWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState<Step>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [analysis, setAnalysis] = React.useState<AnalysisResponse | null>(null);
  const [options, setOptions] = React.useState<Options>({
    mode: "CREATE_AND_UPDATE",
    publicationMode: "SAFE_PUBLISH",
    importEvents: true,
  });
  const [confirmation, setConfirmation] = React.useState("");
  const [pending, setPending] = React.useState<null | "analyse" | "dry" | "import">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RunResponse | null>(null);

  function reset() {
    setStep("upload");
    setFile(null);
    setAnalysis(null);
    setResult(null);
    setConfirmation("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setAnalysis(null);

    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError(`Die Datei ist zu gross. Erlaubt sind maximal ${formatBytes(MAX_BYTES)}.`);
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".json")) {
      setError("Es werden ausschliesslich JSON-Dateien unterstützt.");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  /** Baut das Formular für Analyse, Simulation und Import. */
  function formData(extra?: Record<string, string>) {
    const data = new FormData();
    if (file) data.append("file", file);
    data.append("options", JSON.stringify(options));
    for (const [key, value] of Object.entries(extra ?? {})) data.append(key, value);
    return data;
  }

  async function analyse() {
    if (!file) return;
    setPending("analyse");
    setError(null);
    try {
      const data = await apiRequest<AnalysisResponse>("/api/import/analyse", {
        method: "POST",
        formData: formData(),
      });
      setAnalysis(data);
      setStep("preview");
    } catch (err) {
      const fields = fieldErrors(err);
      setError(fields._ ? `${errorMessage(err)} ${fields._}` : errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  /** Erneute Analyse, wenn sich die Einstellungen ändern. */
  async function refreshAnalysis(next: Options) {
    if (!file) return;
    setOptions(next);
    setPending("analyse");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("options", JSON.stringify(next));
      const updated = await apiRequest<AnalysisResponse>("/api/import/analyse", {
        method: "POST",
        formData: data,
      });
      setAnalysis(updated);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setPending(null);
    }
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    setPending(dryRun ? "dry" : "import");
    setError(null);
    try {
      const data = await apiRequest<RunResponse>("/api/import/run", {
        method: "POST",
        formData: formData({ dryRun: String(dryRun) }),
      });
      setResult(data);
      setStep("done");
      if (!dryRun) router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  const summary = analysis?.summary;
  const importable = summary ? summary.create + summary.review + summary.update : 0;
  const confirmed = confirmation.trim().toUpperCase() === "IMPORTIEREN";

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2" aria-label="Fortschritt">
        {STEPS.map((entry, index) => {
          const currentIndex = STEPS.findIndex((s) => s.id === step);
          const done = index < currentIndex;
          const active = entry.id === step;
          return (
            <li key={entry.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-emerald-600 text-white"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active ? "font-semibold text-primary-900" : "text-muted-foreground",
                )}
              >
                {entry.label}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="mx-1 h-px w-6 bg-border" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* ---------------- Schritt 1: Datei ---------------- */}
      {step === "upload" ? (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Recherchedatei hochladen</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Wähle eine JSON-Datei mit recherchierten Fasnachten und Guggen. Die Datei wird
            zunächst nur geprüft – es wird noch nichts gespeichert.
          </p>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-10 transition-colors hover:bg-muted"
            >
              <FileJson className="h-7 w-7 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium text-slate-700">
                {file ? "Andere Datei wählen" : "JSON-Datei auswählen"}
              </span>
              <span className="text-xs text-muted-foreground">
                Maximal {formatBytes(MAX_BYTES)}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              onChange={onFileChange}
              className="sr-only"
              aria-label="Recherchedatei auswählen"
            />
          </div>

          {file ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button onClick={analyse} disabled={pending !== null}>
                {pending === "analyse" ? <Spinner /> : <Upload />}
                Datei analysieren
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* ---------------- Schritt 2: Vorschau ---------------- */}
      {step === "preview" && analysis && summary ? (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {summary.total} Organisationen erkannt
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analysis.filename} · {formatBytes(analysis.fileSize)}
                  {typeof analysis.metadata.researchRound === "string"
                    ? ` · ${analysis.metadata.researchRound}`
                    : ""}
                </p>
              </div>
              <Button variant="ghost" onClick={reset}>
                <RotateCcw />
                Andere Datei
              </Button>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Neu", value: summary.create, tone: "text-emerald-700" },
                { label: "Updates", value: summary.update, tone: "text-sky-700" },
                { label: "Prüfung nötig", value: summary.review, tone: "text-amber-700" },
                { label: "Mögliche Duplikate", value: summary.duplicate, tone: "text-amber-700" },
                { label: "Übersprungen", value: summary.skip, tone: "text-slate-600" },
                { label: "Ungültig", value: summary.invalid, tone: "text-red-700" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className={cn("mt-0.5 font-display text-2xl font-bold", stat.tone)}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>Fasnachten: <strong className="text-foreground">{summary.carnivals}</strong></span>
              <span>Guggen: <strong className="text-foreground">{summary.guggen}</strong></span>
              <span>
                Agenda-Einträge: <strong className="text-foreground">{summary.events}</strong>
              </span>
              <span>
                Durchschnittliche Confidence:{" "}
                <strong className="text-foreground">{summary.averageConfidence ?? "–"}</strong>
              </span>
            </div>

            {Object.keys(summary.byCanton).length ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nach Kanton
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(summary.byCanton)
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count]) => (
                      <Badge key={code} variant="secondary">
                        {CANTONS.find((c) => c.code === code)?.name ?? code}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
            ) : null}

            {summary.duplicate > 0 ? (
              <Alert variant="warning" className="mt-5" title="Mögliche Duplikate gefunden">
                {summary.duplicate} Datensätze ähneln bestehenden Organisationen. Sie werden
                grundsätzlich nicht automatisch importiert und müssen manuell geprüft werden.
              </Alert>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Datensätze</h2>
            <ImportRecordTable records={analysis.records} />
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Abbrechen
            </Button>
            <Button onClick={() => setStep("configure")} disabled={importable === 0}>
              Weiter zu den Einstellungen
            </Button>
          </div>
        </>
      ) : null}

      {/* ---------------- Schritt 3: Einstellungen ---------------- */}
      {step === "configure" && analysis && summary ? (
        <>
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Einstellungen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Änderungen wirken sich sofort auf die Vorschau aus.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Importmodus"
                htmlFor="mode"
                hint="Bestimmt, ob bereits vorhandene Organisationen aktualisiert werden."
              >
                <Select
                  id="mode"
                  value={options.mode}
                  disabled={pending !== null}
                  onChange={(e) =>
                    refreshAnalysis({ ...options, mode: e.target.value as Options["mode"] })
                  }
                >
                  <option value="CREATE_ONLY">Nur neue Datensätze</option>
                  <option value="CREATE_AND_UPDATE">Neue anlegen und vorhandene aktualisieren</option>
                </Select>
              </Field>

              <Field
                label="Veröffentlichung"
                htmlFor="publicationMode"
                hint="Unsichere Datensätze werden nie automatisch veröffentlicht."
              >
                <Select
                  id="publicationMode"
                  value={options.publicationMode}
                  disabled={pending !== null}
                  onChange={(e) =>
                    refreshAnalysis({
                      ...options,
                      publicationMode: e.target.value as Options["publicationMode"],
                    })
                  }
                >
                  <option value="SAFE_PUBLISH">Sichere Datensätze automatisch veröffentlichen</option>
                  <option value="DRAFT_ONLY">Alles als Entwurf importieren</option>
                </Select>
              </Field>
            </div>

            <label className="mt-5 flex items-start gap-2.5 text-sm text-slate-700">
              <Checkbox
                checked={options.importEvents}
                disabled={pending !== null}
                onChange={(e) => refreshAnalysis({ ...options, importEvents: e.target.checked })}
              />
              <span>
                Eindeutige kommende Fasnachtsdaten als Agenda-Einträge anlegen
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Termine werden als Entwurf angelegt, damit Datum und Quelle vor der
                  Veröffentlichung geprüft werden können.
                </span>
              </span>
            </label>

            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                Mögliche Duplikate werden niemals automatisch importiert
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Diese Regel lässt sich nicht deaktivieren. Unsichere Treffer musst du auf der
                jeweiligen Organisationsseite selbst zusammenführen.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Importbereit</h2>
            <ul className="mt-4 space-y-1.5 text-sm">
              {[
                ["Neue Fasnachten", countBy(analysis, "CARNIVAL")],
                ["Neue Guggen", countBy(analysis, "GUGGE")],
                ["Updates", summary.update],
                ["Prüfung nötig", summary.review],
                ["Mögliche Duplikate (nicht importiert)", summary.duplicate],
                ["Übersprungen", summary.skip],
                ["Ungültig", summary.invalid],
                ["Agenda-Einträge", summary.events],
              ].map(([label, value]) => (
                <li key={String(label)} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-4">
              <Button
                variant="outline"
                block
                onClick={() => run(true)}
                disabled={pending !== null}
              >
                {pending === "dry" ? <Spinner /> : <FlaskConical />}
                Import simulieren (nichts wird gespeichert)
              </Button>

              <Field
                label="Zur Bestätigung IMPORTIEREN eingeben"
                htmlFor="confirmation"
                hint="Der Import verändert die Datenbank. Er kann anschliessend rückgängig gemacht werden."
              >
                <Input
                  id="confirmation"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="IMPORTIEREN"
                  autoComplete="off"
                />
              </Field>

              <Button
                block
                size="lg"
                onClick={() => run(false)}
                disabled={pending !== null || !confirmed}
              >
                {pending === "import" ? <Spinner /> : <Play />}
                Import starten
              </Button>
            </div>
          </Card>

          <div className="flex justify-start">
            <Button variant="ghost" onClick={() => setStep("preview")}>
              Zurück zur Vorschau
            </Button>
          </div>
        </>
      ) : null}

      {/* ---------------- Schritt 4: Ergebnis ---------------- */}
      {step === "done" && result ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            {result.dryRun ? (
              <FlaskConical className="mt-0.5 h-6 w-6 text-sky-600" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" aria-hidden />
            )}
            <div>
              <h2 className="font-display text-lg font-semibold">
                {result.dryRun ? "Simulation abgeschlossen" : "Import abgeschlossen"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lauf {result.reference}
                {result.dryRun
                  ? " · Es wurde nichts gespeichert."
                  : " · Die Änderungen sind gespeichert."}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              ["Erfolgreich angelegt", result.result.created],
              ["Aktualisiert", result.result.updated],
              ["Übersprungen", result.result.skipped],
              ["Fehlgeschlagen", result.result.failed],
              ["Mögliche Duplikate", result.result.duplicates],
              ["Prüfung nötig", result.result.review],
              ["Ungültig", result.result.invalid],
              ["Agenda-Einträge", result.result.events],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-display text-2xl font-bold text-primary-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {result.result.failed > 0 ? (
            <Alert variant="warning" className="mt-5" title="Einzelne Datensätze fehlgeschlagen">
              Die übrigen Datensätze wurden trotzdem importiert. Die Details findest du im
              Importprotokoll.
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/dashboard/import/${result.jobId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-800"
            >
              Importprotokoll öffnen
            </Link>
            {result.dryRun ? (
              <Button variant="outline" onClick={() => setStep("configure")}>
                Zurück zu den Einstellungen
              </Button>
            ) : null}
            <Button variant="ghost" onClick={reset}>
              Weitere Datei importieren
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/** Zählt neu anzulegende Datensätze eines Typs. */
function countBy(analysis: AnalysisResponse, type: "CARNIVAL" | "GUGGE"): number {
  return analysis.records.filter(
    (record) => record.type === type && (record.action === "CREATE" || record.action === "REVIEW"),
  ).length;
}
