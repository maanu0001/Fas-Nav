"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Live-Suche über den Adressparameter `q`.
 *
 * Die Suche läuft serverseitig: Der Begriff steht in der Adresse, die Seite
 * wird neu gerendert. Damit nicht bei jedem Tastendruck eine Anfrage entsteht,
 * wird die Eingabe kurz entprellt. `router.replace` statt `push` sorgt dafür,
 * dass der Verlauf des Browsers nicht mit Zwischenständen zugestellt wird –
 * ein Klick auf "Zurück" führt also zur vorherigen Seite und nicht Buchstabe
 * für Buchstabe durch die Eingabe.
 *
 * Diese Datei ist die einzige Stelle mit dieser Logik; die Filterleisten des
 * öffentlichen Bereichs und des Dashboards greifen beide darauf zu.
 */

/** Wartezeit zwischen letztem Tastendruck und Anfrage. */
export const SEARCH_DEBOUNCE_MS = 250;

export function useLiveSearch(): {
  term: string;
  setTerm: (value: string) => void;
  /** Setzt einen beliebigen Filterparameter und springt auf Seite 1 zurück. */
  applyParam: (name: string, value: string) => void;
  /** Entfernt Suchbegriff und die angegebenen Filter. */
  reset: (names: string[]) => void;
  searchParams: URLSearchParams;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTerm = searchParams.get("q") ?? "";
  const [term, setTerm] = React.useState(urlTerm);

  // Änderungen von aussen (Zurück-Taste, Zurücksetzen) übernehmen.
  React.useEffect(() => {
    setTerm(urlTerm);
  }, [urlTerm]);

  const applyParam = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete("page"); // Ein neuer Filter beginnt wieder auf Seite 1.
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Entprellte Übernahme des Suchbegriffs in die Adresse.
  React.useEffect(() => {
    const getrimmt = term.trim();
    if (getrimmt === urlTerm) return;

    const timer = setTimeout(() => applyParam("q", getrimmt), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, urlTerm, applyParam]);

  const reset = React.useCallback(
    (names: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const name of names) params.delete(name);
      params.delete("q");
      params.delete("page");
      setTerm("");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { term, setTerm, applyParam, reset, searchParams };
}
