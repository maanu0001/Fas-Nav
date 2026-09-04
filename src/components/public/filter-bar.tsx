"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export type FilterDefinition = {
  name: string;
  label: string;
  options: FilterOption[];
  placeholder?: string;
};

/**
 * Filterleiste, die den URL-Zustand führt.
 * Dadurch bleiben Filter teilbar, bookmarkbar und serverseitig renderbar.
 */
export function FilterBar({
  filters,
  searchPlaceholder = "Suchen …",
  showSearch = true,
  extra,
  className,
}: {
  filters: FilterDefinition[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  extra?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState(searchParams.get("q") ?? "");

  React.useEffect(() => {
    setTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  const applyParam = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete("page"); // Filterwechsel springt zurück auf Seite 1.
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    applyParam("q", term.trim());
  }

  const activeFilters = filters.filter((f) => searchParams.get(f.name));
  const hasActive = activeFilters.length > 0 || Boolean(searchParams.get("q"));

  function reset() {
    const params = new URLSearchParams(searchParams.toString());
    for (const filter of filters) params.delete(filter.name);
    params.delete("q");
    params.delete("page");
    setTerm("");
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-subtle", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {showSearch ? (
          <form onSubmit={onSubmit} className="relative flex-1" role="search">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Suchbegriff"
              className="pl-9"
            />
          </form>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="sm:hidden"
            block
          >
            <SlidersHorizontal />
            Filter
            {activeFilters.length ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] text-primary-foreground">
                {activeFilters.length}
              </span>
            ) : null}
          </Button>
          {hasActive ? (
            <Button variant="ghost" onClick={reset} className="hidden sm:inline-flex">
              <X />
              Zurücksetzen
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
          open ? "grid" : "hidden sm:grid",
        )}
      >
        {filters.map((filter) => (
          <label key={filter.name} className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {filter.label}
            </span>
            <Select
              value={searchParams.get(filter.name) ?? ""}
              onChange={(e) => applyParam(filter.name, e.target.value)}
            >
              <option value="">{filter.placeholder ?? "Alle"}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
        {extra}
      </div>

      {hasActive ? (
        <div className="mt-3 sm:hidden">
          <Button variant="ghost" onClick={reset} block>
            <X />
            Filter zurücksetzen
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Datumsbereich-Filter für die Agenda. */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(name: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Von</span>
        <Input
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => apply("from", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Bis</span>
        <Input
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => apply("to", e.target.value)}
        />
      </label>
    </>
  );
}
