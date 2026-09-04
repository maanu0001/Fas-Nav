import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { NavIcon } from "@/components/dashboard/nav-icon";

export type QuickAction = {
  href: string;
  label: string;
  description?: string;
  icon: string;
};

/** Schnellaktionen für den Einstieg ins Dashboard. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (!actions.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            <NavIcon name={action.icon} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-semibold text-primary-900">
              {action.label}
              <ArrowRight
                className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </p>
            {action.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
