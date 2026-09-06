import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INDEXABILITY_SELECT,
  MIN_INDEX_SCORE,
  isIndexableEvent,
  isIndexableOrganization,
  isPublicOrganization,
  organizationContentScore,
} from "@/lib/indexability";
import {
  breadcrumbJsonLd,
  buildMetadata,
  eventJsonLd,
  jsonLdScript,
  listCanonical,
  organizationJsonLd,
} from "@/lib/seo";

/**
 * Tests der SEO-Regeln.
 *
 * Der wichtigste Punkt: Seite und Sitemap müssen dieselbe Antwort auf die
 * Frage geben, ob ein Profil indexiert wird. Läuft das auseinander, entstehen
 * entweder Seiten mit noindex in der Sitemap oder indexierte Seiten, die
 * Google nie angeboten bekommt.
 */

const VOLL = {
  status: "PUBLISHED",
  name: "Oltner Fasnacht",
  city: "Olten",
  shortDescription: "Die Oltner Fasnacht verwandelt die Altstadt in eine Bühne aus Guggenmusik, Wagen und Schnitzelbänken.",
  description: null,
  website: "https://example.ch",
  logoId: "m1",
  headerId: null,
  _count: { events: 3, socialLinks: 2, media: 4 },
};

const LEER = {
  status: "PUBLISHED",
  name: "Dünne Testfasnacht",
  city: "Balsthal",
  shortDescription: null,
  description: null,
  website: null,
  logoId: null,
  headerId: null,
  _count: { events: 0, socialLinks: 0, media: 0 },
};

describe("Indexierbarkeit von Profilen", () => {
  it("ein Profil mit Substanz gehört in den Index", () => {
    assert.equal(isIndexableOrganization(VOLL), true);
    assert.ok(organizationContentScore(VOLL) >= MIN_INDEX_SCORE);
  });

  it("ein leeres Profil gehört nicht in den Index", () => {
    assert.equal(isIndexableOrganization(LEER), false);
    assert.equal(organizationContentScore(LEER), 0);
  });

  it("Name und Ort allein genügen nicht", () => {
    // Genau der Zustand eines frisch importierten Datensatzes.
    assert.equal(isIndexableOrganization({ ...LEER, name: "X", city: "Y" }), false);
  });

  it("ein nicht veröffentlichtes Profil ist nie indexierbar", () => {
    for (const status of ["DRAFT", "PENDING_REVIEW", "UNPUBLISHED", "SUSPENDED"]) {
      assert.equal(isPublicOrganization({ status }), false, status);
      assert.equal(isIndexableOrganization({ ...VOLL, status }), false, status);
    }
  });

  it("der Übernahmestatus spielt keine Rolle", () => {
    // isIndexableOrganization kennt claimStatus gar nicht – das ist Absicht.
    assert.ok(!Object.keys(INDEXABILITY_SELECT).includes("claimStatus"));
  });

  it("eine ausführliche Beschreibung allein reicht noch nicht", () => {
    const nurText = { ...LEER, shortDescription: "x".repeat(150) };
    assert.equal(organizationContentScore(nurText), 2);
    assert.equal(isIndexableOrganization(nurText), false);
  });

  it("Beschreibung und ein Termin genügen", () => {
    const knapp = { ...LEER, shortDescription: "x".repeat(150), _count: { events: 1, socialLinks: 0, media: 0 } };
    assert.equal(isIndexableOrganization(knapp), true);
  });

  it("fehlender Ort schliesst aus", () => {
    assert.equal(isIndexableOrganization({ ...VOLL, city: "" }), false);
    assert.equal(isIndexableOrganization({ ...VOLL, city: null }), false);
  });

  it("die Abfrage lädt alle bewerteten Felder", () => {
    for (const feld of ["status", "name", "city", "shortDescription", "description", "website", "logoId", "headerId"]) {
      assert.ok(feld in INDEXABILITY_SELECT, `${feld} fehlt in der Abfrage`);
    }
  });
});

describe("Indexierbarkeit von Veranstaltungen", () => {
  it("veröffentlicht bei veröffentlichter Organisation", () => {
    assert.equal(isIndexableEvent({ status: "PUBLISHED", organization: { status: "PUBLISHED" } }), true);
  });

  it("ein Entwurf gehört nicht in den Index", () => {
    assert.equal(isIndexableEvent({ status: "DRAFT", organization: { status: "PUBLISHED" } }), false);
  });

  it("ein Termin einer nicht öffentlichen Organisation ebenfalls nicht", () => {
    assert.equal(isIndexableEvent({ status: "PUBLISHED", organization: { status: "DRAFT" } }), false);
  });
});

describe("Canonical von Verzeichnissen", () => {
  it("die unveränderte Liste zeigt auf sich selbst", () => {
    assert.deepEqual(listCanonical("/fasnachten", {}), { path: "/fasnachten", noIndex: false });
  });

  it("eine geblätterte Seite zeigt auf sich selbst und bleibt im Index", () => {
    assert.deepEqual(listCanonical("/fasnachten", { page: "2" }), {
      path: "/fasnachten?page=2",
      noIndex: false,
    });
  });

  it("Seite 1 wird nicht als Parameter geführt", () => {
    assert.deepEqual(listCanonical("/agenda", { page: "1" }), { path: "/agenda", noIndex: false });
  });

  it("gefilterte Ansichten zeigen auf die Liste und bleiben aussen vor", () => {
    for (const params of [
      { canton: "luzern" },
      { q: "See" },
      { sort: "newest" },
      { view: "calendar" },
      { canton: "luzern", page: "2" },
    ]) {
      const ergebnis = listCanonical("/agenda", params);
      assert.equal(ergebnis.path, "/agenda", JSON.stringify(params));
      assert.equal(ergebnis.noIndex, true, JSON.stringify(params));
    }
  });

  it("leere Parameter zählen nicht als Filter", () => {
    assert.deepEqual(listCanonical("/guggen", { canton: "", q: undefined }), {
      path: "/guggen",
      noIndex: false,
    });
  });

  it("eine unsinnige Seitenzahl führt nicht zu einer eigenen Adresse", () => {
    for (const page of ["0", "-3", "abc"]) {
      assert.equal(listCanonical("/guggen", { page }).path, "/guggen", page);
    }
  });
});

describe("Metadata", () => {
  it("setzt Canonical, Open Graph und Twitter aus einer Quelle", () => {
    const m = buildMetadata({ title: "Test", description: "Beschreibung", path: "/fasnachten" });
    assert.match(String(m.alternates?.canonical), /\/fasnachten$/);
    assert.equal(m.openGraph?.title, "Test");
    assert.equal(m.twitter?.title, "Test");
  });

  it("greift ohne Beschreibung auf den Standardtext zurück", () => {
    const m = buildMetadata({ title: "Test", description: null, path: "/x" });
    assert.ok(typeof m.description === "string" && m.description.length > 0);
  });

  it("setzt ohne Bild das Standardbild", () => {
    const m = buildMetadata({ title: "Test", path: "/x" });
    const bilder = m.openGraph?.images as { url: string }[];
    assert.match(bilder[0].url, /og-default\.png$/);
  });

  it("trennt noindex von nofollow", () => {
    // Eine dünne Seite soll aus dem Index, ihre Verweise aber verfolgt werden.
    const inhalt = buildMetadata({ title: "T", path: "/x", noIndex: true });
    assert.deepEqual(inhalt.robots, { index: false, follow: true });

    const privat = buildMetadata({ title: "T", path: "/x", noIndex: true, noFollow: true });
    assert.deepEqual(privat.robots, { index: false, follow: false });
  });
});

describe("Strukturierte Daten", () => {
  it("maskiert spitze Klammern – kein Ausbruch aus dem Script-Tag", () => {
    const { __html } = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    assert.ok(!__html.includes("</script>"));
    assert.ok(__html.includes("\\u003c"));
    // Trotz Maskierung bleibt es gültiges JSON.
    assert.equal(JSON.parse(__html.replace(/\\u003c/g, "<")).name, "</script><script>alert(1)</script>");
  });

  it("lässt fehlende Angaben weg, statt sie zu raten", () => {
    const ld = organizationJsonLd({
      name: "Test", slug: "test", type: "CARNIVAL", city: "Olten", cantonName: "Solothurn",
    });
    for (const feld of ["description", "logo", "image", "email", "telephone", "sameAs", "foundingDate"]) {
      assert.ok(!(feld in ld), `${feld} dürfte nicht gesetzt sein`);
    }
    assert.equal(ld["@type"], "Organization");
  });

  it("kennzeichnet Guggen als MusicGroup", () => {
    const ld = organizationJsonLd({ name: "G", slug: "g", type: "GUGGE", city: "Luzern", cantonName: "Luzern" });
    assert.equal(ld["@type"], "MusicGroup");
    assert.match(String(ld.url), /\/gugge\/g$/);
  });

  it("schreibt Veranstaltungsdaten im erwarteten Format", () => {
    const start = new Date("2027-02-14T13:00:00.000Z");
    const ld = eventJsonLd({
      title: "Monsterkonzert Olten 2027", slug: "monsterkonzert-olten-2027",
      startDate: start, city: "Olten", cantonName: "Solothurn",
      organizerName: "Oltner Fasnacht", isPast: false,
    });
    assert.equal(ld["@type"], "Event");
    assert.equal(ld.startDate, start.toISOString());
    assert.match(String(ld.startDate), /^\d{4}-\d{2}-\d{2}T/);
    assert.equal((ld.location as Record<string, unknown>)["@type"], "Place");
    assert.ok(!("offers" in ld), "Ohne Preis darf kein Angebot ausgegeben werden");
  });

  it("nummeriert Brotkrumen ab eins", () => {
    const ld = breadcrumbJsonLd([
      { name: "Startseite", path: "/" },
      { name: "Fasnachten", path: "/fasnachten" },
      { name: "Oltner Fasnacht", path: "/fasnacht/oltner-fasnacht" },
    ]);
    const liste = ld.itemListElement as { position: number; name: string; item: string }[];
    assert.deepEqual(liste.map((e) => e.position), [1, 2, 3]);
    assert.match(liste[2].item, /\/fasnacht\/oltner-fasnacht$/);
  });
});
