"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Hell, Dunkel und System.
 *
 * next-themes setzt die Klasse "dark" am <html>-Element noch vor dem ersten
 * Anzeigen über ein kleines eingebettetes Skript. Dadurch entsteht beim Laden
 * kein sichtbarer Wechsel von Hell nach Dunkel.
 *
 * Ohne eigene Auswahl gilt das helle Thema. Wer "System" wählt, folgt weiter
 * der Einstellung des Betriebssystems; eine einmal getroffene Auswahl liegt im
 * localStorage und wird nicht überschrieben.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="fasnav-theme"
      // Beim Umschalten keine Übergänge, sonst flackern grosse Flächen kurz.
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
