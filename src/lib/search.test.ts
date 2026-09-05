import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildEventWhere } from "@/lib/queries/public";
import { eventSearchWhere, matchingEventTypes, normalizeSearchTerm } from "@/lib/search";
import type { Prisma } from "@prisma/client";

/**
 * Tests der Suchbedingungen.
 *
 * Der eigentliche Fehler war strukturell: Mehrere Teilbedingungen brauchten den
 * Schlüssel `OR`, standen aber im selben Objektliteral – die Suche wurde von der
 * Bedingung auf kommende Termine überschrieben und verschwand. Diese Tests
 * prüfen deshalb nicht nur, ob gesucht wird, sondern dass sich die Bedingungen
 * gegenseitig überleben.
 */

/** Sammelt alle Feldnamen, die in einer Where-Struktur vorkommen. */
function felder(where: unknown, pfad = "", gefunden = new Set<string>()): Set<string> {
  if (!where || typeof where !== "object") return gefunden;
  if (Array.isArray(where)) {
    for (const eintrag of where) felder(eintrag, pfad, gefunden);
    return gefunden;
  }
  for (const [schluessel, wert] of Object.entries(where as Record<string, unknown>)) {
    if (schluessel === "contains") gefunden.add(pfad);
    else felder(wert, schluessel === "OR" || schluessel === "AND" ? pfad : schluessel, gefunden);
  }
  return gefunden;
}

describe("Suchbegriff aufbereiten", () => {
  it("entfernt Leerzeichen am Rand", () => {
    assert.equal(normalizeSearchTerm("  See  "), "See");
  });

  it("zieht mehrfache Leerzeichen zusammen", () => {
    assert.equal(normalizeSearchTerm("Oltner   Fasnacht"), "Oltner Fasnacht");
  });

  it("behandelt fehlende Eingaben", () => {
    assert.equal(normalizeSearchTerm(null), "");
    assert.equal(normalizeSearchTerm(undefined), "");
    assert.equal(normalizeSearchTerm("   "), "");
  });

  it("lässt Gross-/Kleinschreibung unangetastet – das erledigt die Datenbank", () => {
    assert.equal(normalizeSearchTerm("SEE"), "SEE");
  });
});

describe("Suchbedingung für Veranstaltungen", () => {
  it("ergibt ohne Begriff nichts", () => {
    assert.equal(eventSearchWhere(""), null);
    assert.equal(eventSearchWhere("   "), null);
  });

  it("greift bereits ab einem Zeichen", () => {
    const where = eventSearchWhere("S");
    assert.ok(where, "Ein Zeichen muss genügen");
    assert.ok((where.OR as unknown[]).length > 0);
  });

  it("sucht in Titel, Beschreibung, Ort, Lokal, Kanton und Veranstalter", () => {
    const gefunden = felder(eventSearchWhere("See"));
    for (const feld of [
      "title",
      "shortDescription",
      "description",
      "city",
      "venueName",
      "name",
      "region",
    ]) {
      assert.ok(gefunden.has(feld), `Feld ${feld} fehlt in der Suche`);
    }
  });

  it("sucht ohne Rücksicht auf Gross-/Kleinschreibung", () => {
    const where = eventSearchWhere("see") as { OR: Record<string, { contains: string; mode: string }>[] };
    const titel = where.OR.find((b) => "title" in b);
    assert.equal(titel?.title.mode, "insensitive");
  });

  it("verwendet den bereinigten Begriff", () => {
    const where = eventSearchWhere("  See  ") as { OR: Record<string, { contains: string }>[] };
    const titel = where.OR.find((b) => "title" in b);
    assert.equal(titel?.title.contains, "See");
  });
});

describe("Veranstaltungstypen als Suchtreffer", () => {
  it("findet Typen über ihre deutsche Bezeichnung", () => {
    assert.deepEqual(matchingEventTypes("monsterkonzert"), ["MONSTERKONZERT"]);
    assert.deepEqual(matchingEventTypes("konzert").sort(), ["GUGGENKONZERT", "MONSTERKONZERT"]);
  });

  it("ignoriert zu kurze Eingaben, die sonst fast jeden Typ träfen", () => {
    assert.deepEqual(matchingEventTypes("a"), []);
    assert.deepEqual(matchingEventTypes("um"), []);
  });
});

describe("Where-Aufbau der Agenda", () => {
  it("verliert die Suche nicht neben dem Filter auf kommende Termine", () => {
    // Genau dieser Aufruf entsteht in der Agenda: Standardmässig werden nur
    // kommende Termine gezeigt. Vorher hat das die Suche überschrieben.
    const where = buildEventWhere({ q: "See", upcomingOnly: true });
    const bedingungen = (where.AND ?? []) as Prisma.EventWhereInput[];
    assert.ok(Array.isArray(bedingungen), "Bedingungen müssen als Liste stehen");

    const gefunden = felder(where);
    assert.ok(gefunden.has("title"), "Die Suche im Titel fehlt");

    // Der Filter auf kommende Termine muss ebenfalls erhalten bleiben.
    const text = JSON.stringify(where);
    assert.ok(text.includes("endDate"), "Der Zeitfilter fehlt");
  });

  it("kombiniert Suche mit Kanton, Typ und Zeitraum", () => {
    const where = buildEventWhere({
      q: "See",
      canton: "luzern",
      type: "UMZUG",
      upcomingOnly: true,
      from: new Date("2027-01-01"),
      to: new Date("2027-12-31"),
    });
    const text = JSON.stringify(where);
    assert.ok(text.includes('"slug":"luzern"'), "Kantonsfilter fehlt");
    assert.ok(text.includes('"type":"UMZUG"'), "Typfilter fehlt");
    assert.ok(text.includes('"contains":"See"'), "Suchbegriff fehlt");
    assert.ok(text.includes("2027-01-01"), "Beginn des Zeitraums fehlt");
    assert.ok(text.includes("2027-12-31"), "Ende des Zeitraums fehlt");
  });

  it("hält Kanton und Region auseinander", () => {
    // Beide schreiben auf dieselbe Beziehung; in einer Liste bleiben sie beide
    // bestehen und wirken als Und-Verknüpfung.
    const where = buildEventWhere({ canton: "luzern", region: "Zentralschweiz" });
    const text = JSON.stringify(where);
    assert.ok(text.includes('"slug":"luzern"'), "Kantonsfilter fehlt");
    assert.ok(text.includes('"region":"Zentralschweiz"'), "Regionsfilter fehlt");
  });

  it("zeigt ohne Filter nur veröffentlichte Inhalte", () => {
    const where = buildEventWhere({});
    assert.equal(where.status, "PUBLISHED");
    assert.equal(where.AND, undefined);
  });
});
