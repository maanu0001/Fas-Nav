import * as React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Leerer Zustand mit optionaler Handlungsaufforderung. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-subtle">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="font-display text-base font-semibold text-primary-900">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Es ist ein Fehler aufgetreten",
  description,
  action,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900",
        className,
      )}
      role="alert"
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {title}
      </p>
      {description ? <p className="mt-1 text-red-800">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />
  );
}

export function LoadingState({ label = "Wird geladen …" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

/** Platzhalter-Raster während des Ladens von Card-Listen. */
export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-4 h-36 w-full rounded-lg" />
          <Skeleton className="mb-2 h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
