import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AVAILABLE_PLACEHOLDERS,
  PREVIEW_PLACEHOLDERS,
  REMINDER_DEFAULTS,
  REMINDER_SETTING_KEYS,
  fillPlaceholders,
  pickRecipient,
  type ReminderPlaceholders,
} from "@/lib/agenda-reminder";
import { can } from "@/lib/rbac";

/**
 * Tests der Erinnerung an fehlende Agenda-Einträge.
 *
 * Der Text stammt aus den Einstellungen und geht an Aussenstehende. Geprüft
 * wird deshalb, dass die Ersetzung nichts auswertet, dass genau eine Person je
 * Organisation angeschrieben wird und dass die Einstellungen der Administration
 * vorbehalten bleiben.
 */

const WERTE: ReminderPlaceholders = {
  name: "Anna Beispiel",
  organizationName: "Oltner Fasnacht",
  profileUrl: "https://fas-nav.ch/fasnacht/oltner-fasnacht",
  dashboardUrl: "https://fas-nav.ch/dashboard",
  eventCreateUrl: "https://fas-nav.ch/dashboard/veranstaltungen/neu",
};

const konto = (
  role: string,
  email: string,
  tage: number,
  isActive = true,
  name = email,
) => ({ role, createdAt: new Date(2026, 0, tage), user: { email, name, isActive } });

describe("Platzhalter", () => {
  it("ersetzt alle vorgesehenen Angaben", () => {
    const text = fillPlaceholders(
      "Hallo {{name}}, {{organizationName}}: {{profileUrl}} {{dashboardUrl}} {{eventCreateUrl}}",
      WERTE,
    );
    assert.equal(
      text,
      "Hallo Anna Beispiel, Oltner Fasnacht: https://fas-nav.ch/fasnacht/oltner-fasnacht https://fas-nav.ch/dashboard https://fas-nav.ch/dashboard/veranstaltungen/neu",
    );
  });

  it("verträgt Leerzeichen in den Klammern", () => {
    assert.equal(fillPlaceholders("{{ name }}", WERTE), "Anna Beispiel");
  });

  it("lässt unbekannte Platzhalter stehen, damit ein Tippfehler auffällt", () => {
    assert.equal(fillPlaceholders("{{quatsch}} {{name}}", WERTE), "{{quatsch}} Anna Beispiel");
    assert.equal(fillPlaceholders("{{Name}}", WERTE), "{{Name}}");
  });

  it("wertet nichts aus – der Text bleibt Text", () => {
    // Weder Ausdrücke noch Zugriffe auf Objekte werden ausgeführt.
    const eingabe = "${process.env.AUTH_SECRET} {{constructor}} {{__proto__}} <script>alert(1)</script>";
    assert.equal(fillPlaceholders(eingabe, WERTE), eingabe);
  });

  it("ersetzt denselben Platzhalter mehrfach", () => {
    assert.equal(fillPlaceholders("{{name}} und {{name}}", WERTE), "Anna Beispiel und Anna Beispiel");
  });

  it("die Hilfe im Adminbereich listet genau die unterstützten Angaben", () => {
    assert.deepEqual(AVAILABLE_PLACEHOLDERS, [
      "{{name}}",
      "{{organizationName}}",
      "{{profileUrl}}",
      "{{dashboardUrl}}",
      "{{eventCreateUrl}}",
    ]);
  });

  it("die Vorschau lässt keinen Platzhalter stehen", () => {
    const vorschau = fillPlaceholders(REMINDER_DEFAULTS.body, PREVIEW_PLACEHOLDERS);
    assert.ok(!vorschau.includes("{{"), "In der Vorschau darf kein Platzhalter übrig bleiben");
    assert.ok(vorschau.includes("Anna Beispiel"));
  });
});

describe("Wahl der zuständigen Person", () => {
  it("bevorzugt Vollzugriff vor Verwaltung vor Bearbeitung", () => {
    const gewaehlt = pickRecipient([
      konto("EDITOR", "editor@example.ch", 1),
      konto("OWNER", "owner@example.ch", 3),
      konto("MANAGER", "manager@example.ch", 2),
    ]);
    assert.equal(gewaehlt?.email, "owner@example.ch");
  });

  it("nimmt bei gleicher Rolle das älteste Konto – die Wahl bleibt stabil", () => {
    const eingabe = [konto("OWNER", "neu@example.ch", 9), konto("OWNER", "alt@example.ch", 2)];
    assert.equal(pickRecipient(eingabe)?.email, "alt@example.ch");
    // Auch in umgekehrter Reihenfolge dasselbe Ergebnis.
    assert.equal(pickRecipient([...eingabe].reverse())?.email, "alt@example.ch");
  });

  it("überspringt gesperrte Konten", () => {
    const gewaehlt = pickRecipient([
      konto("OWNER", "gesperrt@example.ch", 1, false),
      konto("EDITOR", "aktiv@example.ch", 2),
    ]);
    assert.equal(gewaehlt?.email, "aktiv@example.ch");
  });

  it("schreibt nie mehrere Personen an", () => {
    const gewaehlt = pickRecipient([
      konto("OWNER", "a@example.ch", 1),
      konto("OWNER", "b@example.ch", 2),
      konto("MANAGER", "c@example.ch", 3),
    ]);
    assert.equal(typeof gewaehlt?.email, "string");
  });

  it("liefert nichts, wenn niemand in Frage kommt", () => {
    assert.equal(pickRecipient([]), null);
    assert.equal(pickRecipient([konto("OWNER", "x@example.ch", 1, false)]), null);
    assert.equal(pickRecipient([konto("OWNER", "", 1)]), null);
  });

  it("verträgt eine unbekannte Rolle, ohne sie zu bevorzugen", () => {
    const gewaehlt = pickRecipient([
      konto("IRGENDWAS", "unbekannt@example.ch", 1),
      konto("EDITOR", "editor@example.ch", 5),
    ]);
    assert.equal(gewaehlt?.email, "editor@example.ch");
  });
});

describe("Vorgaben und Einstellungen", () => {
  it("die Erinnerung ist von Haus aus ausgeschaltet", () => {
    assert.equal(REMINDER_DEFAULTS.enabled, false);
  });

  it("die Vorgabetexte nutzen nur unterstützte Platzhalter", () => {
    const gefunden = [...REMINDER_DEFAULTS.body.matchAll(/\{\{\s*([a-zA-Z]+)\s*\}\}/g)].map((m) => `{{${m[1]}}}`);
    for (const p of gefunden) {
      assert.ok(AVAILABLE_PLACEHOLDERS.includes(p), `${p} wird nicht unterstützt`);
    }
  });

  it("die Standardfrist verhindert tägliche Mails", () => {
    assert.ok(REMINDER_DEFAULTS.cooldownDays >= 7);
  });

  it("die Schlüssel liegen im gemeinsamen Einstellungsspeicher", () => {
    for (const key of Object.values(REMINDER_SETTING_KEYS)) {
      assert.match(key, /^agenda_reminder_/);
    }
  });
});

describe("Wer die Erinnerung einstellen darf", () => {
  it("ausschliesslich ADMIN", () => {
    assert.equal(can("ADMIN", "manageSettings"), true);
    assert.equal(can("TEAM", "manageSettings"), false);
    assert.equal(can("FASNACHT", "manageSettings"), false);
    assert.equal(can("GUGGE", "manageSettings"), false);
    assert.equal(can(null, "manageSettings"), false);
  });
});
