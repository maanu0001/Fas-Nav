import * as React from "react";
import Link from "next/link";

import { NavIcon } from "@/components/dashboard/nav-icon";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "text-primary-700 bg-primary-50",
    warning: "text-amber-700 bg-amber-50",
    danger: "text-red-700 bg-red-50",
    success: "text-emerald-700 bg-emerald-50",
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              tones[tone],
            )}
          >
            <NavIcon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-primary-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const className =
    "block rounded-xl border border-border bg-card p-5 shadow-subtle transition-all";

  return href ? (
    <Link href={href} className={cn(className, "hover:-translate-y-0.5 hover:shadow-card")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/**
 * Kachelraster, das sich der Anzahl Kacheln anpasst.
 *
 * Die Spaltenzahl folgt der Anzahl Kacheln, damit keine einzelne Kachel in
 * einer eigenen Reihe zurückbleibt, wenn eine Rolle einzelne Kacheln nicht
 * sehen darf. Bis zu fünf Kacheln stehen in einer Reihe, darüber wird auf
 * vier Spalten umgebrochen. Die Klassennamen stehen ausgeschrieben, weil
 * Tailwind nur vollständig im Quelltext vorkommende Klassen erzeugt.
 */
const COLUMNS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export function StatGrid({ children }: { children: React.ReactNode }) {
  const count = React.Children.toArray(children).filter(Boolean).length;
  const columns = COLUMNS[count] ?? "lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-3", columns)}>{children}</div>
  );
}
