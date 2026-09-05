import { absoluteUrl } from "@/lib/utils";

/**
 * Erinnerung an Organisationen ohne kommende Veranstaltungen – gemeinsamer Teil.
 *
 * Hier steht nur, was Browser und Server beide brauchen: Schlüssel, Vorgaben,
 * Platzhalter und die Wahl des Empfängers. Der Lauf selbst liegt in
 * agenda-reminder-job.ts, weil er Datenbank und Mailversand anspricht.
 *
 * Die Trennung ist nicht kosmetisch: Solange die Einstellungsmaske – eine
 * Client-Komponente – auf dieselbe Datei zugriff wie der Versand, zog Next.js
 * nodemailer ins Browser-Bündel und die Einstellungsseite antwortete mit einem
 * Serverfehler.
 */

export const REMINDER_SETTING_KEYS = {
  enabled: "agenda_reminder_enabled",
  subject: "agenda_reminder_subject",
  body: "agenda_reminder_body",
  cooldownDays: "agenda_reminder_cooldown_days",
  ctaLabel: "agenda_reminder_cta_label",
} as const;

/** Vorgaben, solange die Administration nichts eigenes hinterlegt hat. */
export const REMINDER_DEFAULTS = {
  enabled: false,
  subject: "Deine Fas-Nav-Agenda ist leer",
  body: `Hallo {{name}}

Für {{organizationName}} sind aktuell keine kommenden Veranstaltungen auf Fas-Nav.ch eingetragen.

Trage deine nächsten Termine ein, damit dein Profil aktuell bleibt und Besucherinnen und Besucher sehen, was bei euch läuft:
{{eventCreateUrl}}

Dein Profil: {{profileUrl}}
Dein Dashboard: {{dashboardUrl}}`,
  cooldownDays: 30,
  ctaLabel: "Veranstaltung eintragen",
} as const;

export type ReminderSettings = {
  enabled: boolean;
  subject: string;
  body: string;
  cooldownDays: number;
  ctaLabel: string;
};

export type ReminderResult = {
  geprueft: number;
  gesendet: number;
  gesperrt: number;
  ohneEmpfaenger: number;
  fehlgeschlagen: number;
  zurueckgesetzt: number;
  abgeschaltet: boolean;
};

export type ReminderPlaceholders = {
  name: string;
  organizationName: string;
  profileUrl: string;
  dashboardUrl: string;
  eventCreateUrl: string;
};

const PLACEHOLDER_KEYS: (keyof ReminderPlaceholders)[] = [
  "name",
  "organizationName",
  "profileUrl",
  "dashboardUrl",
  "eventCreateUrl",
];

/** Für die Hilfe unter dem Eingabefeld im Adminbereich. */
export const AVAILABLE_PLACEHOLDERS = PLACEHOLDER_KEYS.map((k) => `{{${k}}}`);

/**
 * Ersetzt Platzhalter im Text.
 *
 * Es wird nichts ausgewertet, nur ersetzt – der Text aus den Einstellungen
 * kann also keinen Code ausführen. Unbekannte Platzhalter bleiben unverändert
 * stehen, damit ein Tippfehler sichtbar wird, statt still eine Lücke zu
 * hinterlassen.
 */
export function fillPlaceholders(text: string, werte: ReminderPlaceholders): string {
  return text.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (treffer, name: string) => {
    const schluessel = name as keyof ReminderPlaceholders;
    return PLACEHOLDER_KEYS.includes(schluessel) ? werte[schluessel] : treffer;
  });
}

/** Beispielwerte für die Vorschau im Adminbereich. */
export const PREVIEW_PLACEHOLDERS: ReminderPlaceholders = {
  name: "Anna Beispiel",
  organizationName: "Oltner Fasnacht",
  profileUrl: absoluteUrl("/fasnacht/oltner-fasnacht"),
  dashboardUrl: absoluteUrl("/dashboard"),
  eventCreateUrl: absoluteUrl("/dashboard/veranstaltungen/neu"),
};

/**
 * Wählt die zuständige Person.
 *
 * Nicht alle Mitglieder werden angeschrieben, sondern genau eines: bevorzugt
 * ein Konto mit Vollzugriff, sonst Verwaltung, sonst Bearbeitung – bei
 * Gleichstand das älteste, damit die Wahl über Läufe hinweg stabil bleibt.
 * Gesperrte Konten kommen nicht in Frage.
 */
const ROLLENRANG: Record<string, number> = { OWNER: 0, MANAGER: 1, EDITOR: 2 };

export function pickRecipient(
  memberships: {
    role: string;
    createdAt: Date;
    user: { email: string; name: string; isActive: boolean };
  }[],
): { email: string; name: string } | null {
  const geeignet = memberships
    .filter((m) => m.user.isActive && m.user.email)
    .sort(
      (a, b) =>
        (ROLLENRANG[a.role] ?? 9) - (ROLLENRANG[b.role] ?? 9) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  const gewaehlt = geeignet[0];
  return gewaehlt ? { email: gewaehlt.user.email, name: gewaehlt.user.name } : null;
}
