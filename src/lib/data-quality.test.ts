import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectDuplicates,
  evaluateOrganization,
  matchesIssue,
  qualityBand,
  sortQuality,
  summarise,
  type QualityInput,
} from "@/lib/data-quality";

/**
 * Tests der Datenqualitäts-Bewertung.
 *
 * Ausführen mit "npm test". Geprüft wird vor allem, dass der Wert
 * nachvollziehbar bleibt: Er muss der Summe der erfüllten Gewichte
 * entsprechen und darf sich zwischen zwei Läufen nicht unterscheiden.
 */

const JETZT = new Date("2027-01-15T12:00:00Z");

function organisation(overrides: Partial<QualityInput> = {}): QualityInput {
  return {
    id: "o1",
    type: "CARNIVAL",
    name: "Oltner Fasnacht",
    slug: "oltner-fasnacht",
    city: "Olten",
    shortDescription: null,
    description: null,
    logoId: null,
    headerId: null,
    contactEmail: null,
    contactPhone: null,
    bookingEmail: null,
    website: null,
    startDate: null,
    endDate: null,
    foundedYear: null,
    musicStyle: null,
    memberCount: null,
    repertoire: null,
    organizerName: null,
    typicalPeriod: null,
    programHighlights: [],
    status: "PUBLISHED",
    verification: "UNVERIFIED",
    activityStatus: null,
    needsManualReview: false,
    lastVerifiedAt: null,
    updatedAt: JETZT,
    canton: { code: "SO", name: "Solothurn", slug: "solothurn" },
    _count: { socialLinks: 0, events: 0 },
    ...overrides,
  } as QualityInput;
}

describe("Datenqualitäts-Wert", () => {
  it("die Gewichte ergeben zusammen genau 100", () => {
    const summe = evaluateOrganization(organisation(), JETZT).criteria.reduce(
      (s, c) => s + c.weight,
      0,
    );
    assert.equal(summe, 100);
  });

  it("ein vollständiges Profil erreicht 100 Prozent", () => {
    const voll = organisation({
      shortDescription: "Vier Tage Ausnahmezustand an der Aare.",
      logoId: "l1",
      headerId: "h1",
      contactEmail: "info@example.ch",
      website: "https://example.ch",
      startDate: new Date("2027-02-12T00:00:00Z"),
      endDate: new Date("2027-02-16T00:00:00Z"),
      organizerName: "Fasnachtskomitee Olten",
      _count: { socialLinks: 2, events: 3 },
    });
    const bewertung = evaluateOrganization(voll, JETZT);
    assert.equal(bewertung.score, 100);
    assert.deepEqual(bewertung.missing, []);
  });

  it("der Wert entspricht der Summe der erfüllten Gewichte", () => {
    const teil = organisation({ shortDescription: "Text", logoId: "l1" });
    const bewertung = evaluateOrganization(teil, JETZT);
    const erwartet = bewertung.criteria
      .filter((c) => c.fulfilled)
      .reduce((s, c) => s + c.weight, 0);
    assert.equal(bewertung.score, erwartet);
    // Name (4) + Ort (6) + Beschreibung (18) + Logo (14)
    assert.equal(bewertung.score, 42);
  });

  it("liefert bei gleicher Eingabe immer dasselbe Ergebnis", () => {
    const org = organisation({ website: "https://example.ch", headerId: "h1" });
    const a = evaluateOrganization(org, JETZT);
    const b = evaluateOrganization(org, JETZT);
    assert.equal(a.score, b.score);
    assert.deepEqual(
      a.missing.map((m) => m.key),
      b.missing.map((m) => m.key),
    );
  });

  it("zählt einen vergangenen Fasnachtstermin nicht als kommende Ausgabe", () => {
    const vergangen = organisation({ startDate: new Date("2026-02-10T00:00:00Z") });
    const kommend = organisation({ startDate: new Date("2027-02-12T00:00:00Z") });
    assert.ok(evaluateOrganization(vergangen, JETZT).missing.some((m) => m.key === "schedule"));
    assert.ok(!evaluateOrganization(kommend, JETZT).missing.some((m) => m.key === "schedule"));
  });

  it("bewertet eine Gugge nach dem Gründungsjahr statt nach einem Termin", () => {
    const gugge = organisation({ type: "GUGGE", foundedYear: 1978 });
    const kriterium = evaluateOrganization(gugge, JETZT).criteria.find((c) => c.key === "schedule");
    assert.equal(kriterium?.label, "Gründungsjahr");
    assert.equal(kriterium?.fulfilled, true);
  });

  it("meldet ein nie überprüftes und ein lange nicht überprüftes Profil", () => {
    assert.ok(evaluateOrganization(organisation(), JETZT).flags.includes("NEVER_VERIFIED"));
    const alt = organisation({ lastVerifiedAt: new Date("2026-01-01T00:00:00Z") });
    assert.ok(evaluateOrganization(alt, JETZT).flags.includes("STALE_VERIFICATION"));
    const frisch = organisation({ lastVerifiedAt: new Date("2027-01-01T00:00:00Z") });
    assert.ok(!evaluateOrganization(frisch, JETZT).flags.includes("STALE_VERIFICATION"));
  });

  it("ordnet die Wertebereiche zu", () => {
    assert.equal(qualityBand(95), "good");
    assert.equal(qualityBand(70), "medium");
    assert.equal(qualityBand(30), "poor");
  });
});

describe("Dublettenerkennung", () => {
  it("erkennt sehr ähnliche Namen am selben Ort", () => {
    const a = organisation({ id: "a", name: "Luzerner Fasnacht", city: "Luzern" });
    const b = organisation({ id: "b", name: "Lozärner Fasnacht", city: "Luzern" });
    const bewertet = [a, b].map((o) => evaluateOrganization(o, JETZT));
    detectDuplicates(bewertet, [a, b]);
    assert.ok(bewertet[0].flags.includes("POSSIBLE_DUPLICATE"));
    assert.equal(bewertet[0].duplicateOf[0]?.id, "b");
  });

  it("erkennt eine identische Website auch über Orte hinweg", () => {
    const a = organisation({ id: "a", name: "Chesslete", website: "https://chesslete.ch" });
    const b = organisation({
      id: "b",
      name: "Guggenmusik Chesslete",
      city: "Trimbach",
      website: "https://chesslete.ch/",
    });
    const bewertet = [a, b].map((o) => evaluateOrganization(o, JETZT));
    detectDuplicates(bewertet, [a, b]);
    assert.equal(bewertet[0].duplicateOf[0]?.reason, "identische Website");
  });

  it("hält eine Fasnacht und eine Gugge am selben Ort auseinander", () => {
    const a = organisation({ id: "a", name: "Chesslete Olten", type: "CARNIVAL" });
    const b = organisation({ id: "b", name: "Chesslete Olten", type: "GUGGE" });
    const bewertet = [a, b].map((o) => evaluateOrganization(o, JETZT));
    detectDuplicates(bewertet, [a, b]);
    assert.equal(bewertet[0].duplicateOf.length, 0);
  });

  it("meldet unterschiedliche Vereine am selben Ort nicht als Dublette", () => {
    const a = organisation({ id: "a", name: "Fasnachtsgesellschaft Olten" });
    const b = organisation({ id: "b", name: "Narrenzunft Olten" });
    const bewertet = [a, b].map((o) => evaluateOrganization(o, JETZT));
    detectDuplicates(bewertet, [a, b]);
    assert.equal(bewertet[0].duplicateOf.length, 0);
  });

  it("verändert die Datensätze nicht, sondern kennzeichnet sie nur", () => {
    const a = organisation({ id: "a", name: "Luzerner Fasnacht", city: "Luzern" });
    const b = organisation({ id: "b", name: "Lozärner Fasnacht", city: "Luzern" });
    const vorher = JSON.stringify([a, b]);
    const bewertet = [a, b].map((o) => evaluateOrganization(o, JETZT));
    detectDuplicates(bewertet, [a, b]);
    assert.equal(JSON.stringify([a, b]), vorher);
  });
});

describe("Kennzahlen, Filter und Sortierung", () => {
  const daten = [
    organisation({ id: "a", name: "A", logoId: "l", headerId: "h", shortDescription: "T" }),
    organisation({ id: "b", name: "B" }),
    organisation({ id: "c", name: "C", website: "https://c.ch" }),
  ];
  const bewertet = daten.map((o) => evaluateOrganization(o, JETZT));

  it("zählt fehlende Angaben korrekt", () => {
    const k = summarise(bewertet);
    assert.equal(k.total, 3);
    assert.equal(k.withoutLogo, 2);
    assert.equal(k.withoutHeader, 2);
    assert.equal(k.withoutWebsite, 2);
    assert.equal(k.withoutDescription, 2);
  });

  it("filtert nach einzelnen Problemen", () => {
    assert.equal(bewertet.filter((o) => matchesIssue(o, "logo")).length, 2);
    assert.equal(bewertet.filter((o) => matchesIssue(o, "stale")).length, 3);
  });

  it("sortiert die schlechtesten Profile nach vorne", () => {
    const sortiert = sortQuality(bewertet, "score-asc");
    assert.ok(sortiert[0].score <= sortiert[sortiert.length - 1].score);
    const umgekehrt = sortQuality(bewertet, "score-desc");
    assert.ok(umgekehrt[0].score >= umgekehrt[umgekehrt.length - 1].score);
  });
});
