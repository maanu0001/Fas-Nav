import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toEditorState, editorSelect } from "@/lib/editor-state";
import { organizationUpdateSchema } from "@/lib/validation/schemas";

/**
 * Tests der Anreiseangaben.
 *
 * Die Felder sind reiner Freitext von Organisationen und landen auf einer
 * öffentlichen Seite. Geprüft wird deshalb vor allem, dass leere Eingaben zu
 * null werden – nur so entfällt der Abschnitt später zuverlässig – und dass
 * weder HTML noch fremde Adressschemata durchkommen.
 */

const ANREISEFELDER = ["arrivalByCar", "arrivalByPublicTransport", "arrivalNotes"] as const;

describe("Anreiseangaben prüfen", () => {
  it("nimmt alle drei Freitexte an", () => {
    const ergebnis = organizationUpdateSchema.parse({
      arrivalByCar: "Parkhaus Bahnhof, 5 Gehminuten.",
      arrivalByPublicTransport: "Ab Bahnhof 10 Minuten zu Fuss.",
      arrivalNotes: "Veloparkplätze beim Stadtpark.",
    });
    assert.equal(ergebnis.arrivalByCar, "Parkhaus Bahnhof, 5 Gehminuten.");
    assert.equal(ergebnis.arrivalByPublicTransport, "Ab Bahnhof 10 Minuten zu Fuss.");
    assert.equal(ergebnis.arrivalNotes, "Veloparkplätze beim Stadtpark.");
  });

  it("behält Zeilenumbrüche und Absätze", () => {
    const text = "Parkhaus Bahnhof.\nParkhaus Stadthaus.\n\nAchtung: Altstadt gesperrt.";
    assert.equal(organizationUpdateSchema.parse({ arrivalByCar: text }).arrivalByCar, text);
  });

  it("macht leere Eingaben zu null, damit der Abschnitt entfällt", () => {
    for (const feld of ANREISEFELDER) {
      for (const eingabe of ["", "   ", "\n\n"]) {
        const ergebnis = organizationUpdateSchema.parse({ [feld]: eingabe });
        assert.equal(ergebnis[feld], null, `${feld} mit ${JSON.stringify(eingabe)}`);
      }
      assert.equal(organizationUpdateSchema.parse({ [feld]: null })[feld], null);
    }
  });

  it("entfernt HTML aus dem Freitext", () => {
    const ergebnis = organizationUpdateSchema.parse({
      arrivalNotes: '<script>alert(1)</script>Veloparkplatz <b>hier</b>',
    });
    assert.ok(!ergebnis.arrivalNotes?.includes("<"), "Es darf kein Markup übrig bleiben");
    assert.ok(!ergebnis.arrivalNotes?.includes("script"));
    assert.ok(ergebnis.arrivalNotes?.includes("Veloparkplatz"));
  });

  it("begrenzt die Länge", () => {
    for (const feld of ANREISEFELDER) {
      assert.equal(organizationUpdateSchema.safeParse({ [feld]: "x".repeat(4001) }).success, false);
      assert.equal(organizationUpdateSchema.safeParse({ [feld]: "x".repeat(4000) }).success, true);
    }
  });
});

describe("Adressen der Anreise", () => {
  it("nimmt vollständige http(s)-Adressen an", () => {
    const ergebnis = organizationUpdateSchema.parse({
      arrivalMapUrl: "https://maps.example.ch/olten",
      arrivalTransportUrl: "http://www.sbb.ch/de",
    });
    assert.equal(ergebnis.arrivalMapUrl, "https://maps.example.ch/olten");
    assert.equal(ergebnis.arrivalTransportUrl, "http://www.sbb.ch/de");
  });

  it("wertet leer als nicht gesetzt", () => {
    assert.equal(organizationUpdateSchema.parse({ arrivalMapUrl: "" }).arrivalMapUrl, null);
    assert.equal(organizationUpdateSchema.parse({ arrivalMapUrl: null }).arrivalMapUrl, null);
  });

  it("weist fremde Schemata ab – die Adresse wird als Verweis gerendert", () => {
    for (const eingabe of ["javascript:alert(1)", "data:text/html,<script>", "/kontakt", "maps.ch"]) {
      assert.equal(
        organizationUpdateSchema.safeParse({ arrivalMapUrl: eingabe }).success,
        false,
        `${eingabe} müsste abgewiesen werden`,
      );
    }
  });
});

describe("Anreise im Bearbeitungszustand", () => {
  it("die Felder werden für den Editor geladen", () => {
    for (const feld of [...ANREISEFELDER, "arrivalMapUrl", "arrivalTransportUrl"]) {
      assert.equal(
        (editorSelect as Record<string, unknown>)[feld],
        true,
        `${feld} fehlt in der Abfrage des Editors`,
      );
    }
  });

  it("nicht gesetzte Angaben werden zu leeren Feldern statt zu „null“", () => {
    // Der Editor arbeitet mit Zeichenketten; ein null im Eingabefeld würde als
    // Text „null“ erscheinen.
    const zustand = toEditorState({
      name: "Test",
      shortName: null,
      tagline: null,
      shortDescription: null,
      description: null,
      history: null,
      importantInfo: null,
      city: "Olten",
      street: null,
      zip: null,
      cantonId: "c1",
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      website: null,
      bookingEmail: null,
      startDate: null,
      endDate: null,
      foundedYear: null,
      memberCount: null,
      repertoire: null,
      musicStyle: null,
      metaTitle: null,
      metaDesc: null,
      motto: null,
      catchmentArea: null,
      associationType: null,
      typicalPeriod: null,
      organizerName: null,
      performanceArea: null,
      homeCarnival: null,
      hasParade: null,
      hasChildrensCarnival: null,
      hasMaskedBall: null,
      hasMonsterConcert: null,
      hasSchnitzelbank: null,
      hasBeizenfasnacht: null,
      arrivalByCar: null,
      arrivalByPublicTransport: null,
      arrivalNotes: null,
      arrivalMapUrl: null,
      arrivalTransportUrl: null,
      logo: null,
      header: null,
      socialLinks: [],
      // Felder, die toEditorState nicht liest, aber der Typ verlangt:
      id: "o1",
      slug: "test",
      type: "CARNIVAL",
      status: "DRAFT",
    } as unknown as Parameters<typeof toEditorState>[0]);

    assert.equal(zustand.arrivalByCar, "");
    assert.equal(zustand.arrivalByPublicTransport, "");
    assert.equal(zustand.arrivalNotes, "");
    assert.equal(zustand.arrivalMapUrl, "");
    assert.equal(zustand.arrivalTransportUrl, "");
  });

  it("gepflegte Angaben kommen unverändert im Editor an", () => {
    const zustand = toEditorState({
      name: "Test",
      city: "Olten",
      cantonId: "c1",
      arrivalByCar: "Parkhaus Bahnhof.",
      arrivalByPublicTransport: "Bus 3.",
      arrivalNotes: "Veloparkplatz.",
      arrivalMapUrl: "https://maps.example.ch",
      arrivalTransportUrl: "https://sbb.ch",
      socialLinks: [],
    } as unknown as Parameters<typeof toEditorState>[0]);

    assert.equal(zustand.arrivalByCar, "Parkhaus Bahnhof.");
    assert.equal(zustand.arrivalByPublicTransport, "Bus 3.");
    assert.equal(zustand.arrivalNotes, "Veloparkplatz.");
    assert.equal(zustand.arrivalMapUrl, "https://maps.example.ch");
    assert.equal(zustand.arrivalTransportUrl, "https://sbb.ch");
  });
});
