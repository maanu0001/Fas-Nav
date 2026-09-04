import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type PaginationProps = {
  page: number;
  totalPages: number;
  /** Baut die Ziel-URL für eine Seite; erhält die aktiven Filter. */
  buildHref: (page: number) => string;
  className?: string;
};

export function Pagination({ page, totalPages, buildHref, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  const push = (p: number) => pages.push(p);

  push(1);
  if (page > 3) pages.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) push(p);
  if (page < totalPages - 2) pages.push("…");
  if (totalPages > 1) push(totalPages);

  const itemClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:bg-secondary";

  return (
    <nav className={cn("flex items-center justify-center gap-1.5", className)} aria-label="Seitennavigation">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={itemClass} aria-label="Vorherige Seite">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(itemClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              itemClass,
              p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary-800",
            )}
          >
            {p}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={itemClass} aria-label="Nächste Seite">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(itemClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
