"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useLiveSearch } from "@/lib/use-live-search";
import { cn } from "@/lib/utils";

export type DashboardFilter = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

/** Kompakte Filterleiste für Dashboard-Listen, geführt über die URL. */
export function DashboardFilters({
  filters,
  searchPlaceholder,
  className,
}: {
  filters: DashboardFilter[];
  searchPlaceholder?: string;
  className?: string;
}) {
  // Die Suche greift beim Tippen; siehe useLiveSearch.
  const { term, setTerm, applyParam: apply, reset, searchParams } = useLiveSearch();

  const hasActive =
    Boolean(searchParams.get("q")) || filters.some((f) => searchParams.get(f.name));

  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", className)}>
      {searchPlaceholder ? (
        <div className="relative min-w-0 flex-1 sm:max-w-xs" role="search">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Suchen"
            className="pl-9"
          />
        </div>
      ) : null}

      {filters.map((filter) => (
        <label key={filter.name} className="block min-w-0 sm:w-44">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            {filter.label}
          </span>
          <Select
            value={searchParams.get(filter.name) ?? ""}
            onChange={(e) => apply(filter.name, e.target.value)}
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

      {hasActive ? (
        <Button
          variant="ghost"
          onClick={() => reset(filters.map((f) => f.name))}
          className="sm:mb-0"
        >
          <X />
          Zurücksetzen
        </Button>
      ) : null}
    </div>
  );
}
