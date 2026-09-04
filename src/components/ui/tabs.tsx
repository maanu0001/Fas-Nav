"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; exact?: boolean };

/** Navigations-Tabs auf Basis der URL – behält Deep-Links bei. */
export function LinkTabs({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("-mx-1 overflow-x-auto", className)}>
      <nav className="flex min-w-max gap-1 border-b border-border px-1" aria-label="Bereiche">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent-500 text-primary-900"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
