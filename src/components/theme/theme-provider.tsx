"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Hell, Dunkel und System.
 *
 * next-themes setzt die Klasse "dark" am <html>-Element noch vor dem ersten
 * Anzeigen über ein kleines eingebettetes Skript. Dadurch entsteht beim Laden
 * kein sichtbarer Wechsel von Hell nach Dunkel. Die Auswahl liegt im
 * localStorage; ohne Auswahl gilt die Einstellung des Betriebssystems.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="fasnav-theme"
      // Beim Umschalten keine Übergänge, sonst flackern grosse Flächen kurz.
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
