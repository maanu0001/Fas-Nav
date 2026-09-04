import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ImportRecordAction } from "@prisma/client";

/** Verständliche Beschriftungen statt technischer Aktionsnamen. */
export const IMPORT_ACTION_LABELS: Record<ImportRecordAction, string> = {
  CREATE: "Neu",
  UPDATE: "Update",
  SKIP: "Übersprungen",
  DUPLICATE: "Duplikat",
  REVIEW: "Prüfung nötig",
  INVALID: "Fehler",
  FAILED: "Fehlgeschlagen",
};

const VARIANTS: Record<ImportRecordAction, BadgeProps["variant"]> = {
  CREATE: "success",
  UPDATE: "info",
  SKIP: "muted",
  DUPLICATE: "warning",
  REVIEW: "warning",
  INVALID: "destructive",
  FAILED: "destructive",
};

export function ImportActionBadge({ action }: { action: ImportRecordAction }) {
  return <Badge variant={VARIANTS[action]}>{IMPORT_ACTION_LABELS[action]}</Badge>;
}

export const ACTIVITY_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  LIKELY_ACTIVE: "Vermutlich aktiv",
  UNCERTAIN: "Unsicher",
  INACTIVE: "Inaktiv",
  UNKNOWN: "Unbekannt",
};

export function ActivityBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">–</span>;
  const variant: BadgeProps["variant"] =
    status === "ACTIVE"
      ? "success"
      : status === "LIKELY_ACTIVE"
        ? "info"
        : status === "INACTIVE"
          ? "destructive"
          : "muted";
  return <Badge variant={variant}>{ACTIVITY_LABELS[status] ?? status}</Badge>;
}

/** Farbliche Einordnung des Confidence-Werts. */
export function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">–</span>;
  const variant: BadgeProps["variant"] =
    score >= 80 ? "success" : score >= 70 ? "info" : score >= 50 ? "warning" : "destructive";
  return <Badge variant={variant}>{score}</Badge>;
}
