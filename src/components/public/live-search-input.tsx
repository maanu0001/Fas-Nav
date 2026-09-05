"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useLiveSearch } from "@/lib/use-live-search";
import { cn } from "@/lib/utils";

/**
 * Suchfeld ohne Knopf.
 *
 * Die Ergebnisse folgen der Eingabe; ein Absenden ist nicht nötig. Der Begriff
 * steht in der Adresse, die Seite bleibt damit teilbar und wird serverseitig
 * gerendert. Die Entprellung steckt in useLiveSearch – dieselbe Logik wie in
 * den Filterleisten des Verzeichnisses und des Dashboards.
 */
export function LiveSearchInput({
  placeholder = "Suchen …",
  label = "Suchbegriff",
  className,
  autoFocus = false,
}: {
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const { term, setTerm } = useLiveSearch();

  return (
    <div className={cn("relative", className)} role="search">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-12 pl-9"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
      />
    </div>
  );
}
