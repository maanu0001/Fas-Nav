import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { can } from "@/lib/rbac";
import {
  BILLING_INTERVAL_LABELS,
  BILLING_INTERVAL_SUFFIX,
  defaultCtaText,
  defaultCtaUrl,
  formatPlanPrice,
} from "@/lib/pricing";
import { ctaUrlField, featureSchema, planSchema, sortOrderSchema } from "@/lib/validation/schemas";

/**
 * Tests der Preisverwaltung.
 *
 * Zwei Dinge sind hier sicherheitsrelevant: Nur ADMIN darf Preise ändern, und
 * das Ziel des Knopfes landet als Verweis auf einer öffentlichen Seite – es
 * darf deshalb kein beliebiges Schema tragen.
 */

describe("Wer Preise verwalten darf", () => {
  it("ausschliesslich ADMIN", () => {
    assert.equal(can("ADMIN", "managePlans"), true);
    assert.equal(can("TEAM", "managePlans"), false);
    assert.equal(can("FASNACHT", "managePlans"), false);
    assert.equal(can("GUGGE", "managePlans"), false);
    assert.equal(can(null, "managePlans"), false);
  });
});

describe("Ziel des Knopfes", () => {
  it("nimmt einen Pfad innerhalb der Seite an", () => {
    assert.equal(ctaUrlField.parse("/kontakt"), "/kontakt");
  });

  it("nimmt eine vollständige Adresse an", () => {
    assert.equal(ctaUrlField.parse("https://example.ch/angebot"), "https://example.ch/angebot");
  });

  it("wertet leer als „nicht gesetzt“", () => {
    assert.equal(ctaUrlField.parse(""), null);
    assert.equal(ctaUrlField.parse("   "), null);
    assert.equal(ctaUrlField.parse(null), null);
  });

  it("weist gefährliche Schemata ab", () => {
    for (const eingabe of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox",
      "kontakt",
    ]) {
      assert.equal(ctaUrlField.safeParse(eingabe).success, false, `${eingabe} müsste abgewiesen werden`);
    }
  });
});

describe("Tarif prüfen", () => {
  const gueltig = {
    key: "verein_plus",
    tier: "PREMIUM",
    name: "Verein plus",
    priceChf: 75,
  };

  it("nimmt einen vollständigen Tarif an und setzt Standardwerte", () => {
    const ergebnis = planSchema.parse(gueltig);
    assert.equal(ergebnis.currency, "CHF");
    assert.equal(ergebnis.billingInterval, "YEARLY");
    assert.equal(ergebnis.isActive, true);
    assert.equal(ergebnis.sortOrder, 0);
  });

  it("verlangt einen Namen", () => {
    assert.equal(planSchema.safeParse({ ...gueltig, name: "" }).success, false);
  });

  it("weist negative und unsinnige Preise ab", () => {
    assert.equal(planSchema.safeParse({ ...gueltig, priceChf: -5 }).success, false);
    assert.equal(planSchema.safeParse({ ...gueltig, priceChf: "keine Zahl" }).success, false);
  });

  it("akzeptiert den Preis null für ein Gratisangebot", () => {
    assert.equal(planSchema.parse({ ...gueltig, priceChf: 0 }).priceChf, 0);
  });

  it("erzwingt einen brauchbaren Schlüssel", () => {
    assert.equal(planSchema.safeParse({ ...gueltig, key: "Verein Plus" }).success, false);
    assert.equal(planSchema.safeParse({ ...gueltig, key: "a" }).success, false);
  });

  it("prüft den Währungscode", () => {
    assert.equal(planSchema.parse({ ...gueltig, currency: "eur" }).currency, "EUR");
    assert.equal(planSchema.safeParse({ ...gueltig, currency: "Franken" }).success, false);
  });

  it("nimmt Leistungen mit Freitext entgegen", () => {
    const ergebnis = planSchema.parse({
      ...gueltig,
      features: [{ featureId: "abc123", enabled: true, value: "Unlimitiert" }],
    });
    assert.equal(ergebnis.features?.[0].value, "Unlimitiert");
  });
});

describe("Leistung prüfen", () => {
  it("verlangt Bezeichnung und Schlüssel", () => {
    assert.equal(featureSchema.safeParse({ key: "gallery", name: "" }).success, false);
    assert.equal(featureSchema.safeParse({ key: "", name: "Galerie" }).success, false);
    assert.equal(featureSchema.safeParse({ key: "gallery", name: "Galerie" }).success, true);
  });
});

describe("Reihenfolge prüfen", () => {
  it("nimmt eine Liste aus Kennung und Position an", () => {
    const ergebnis = sortOrderSchema.parse({
      order: [
        { id: "a", sortOrder: 0 },
        { id: "b", sortOrder: 1 },
      ],
    });
    assert.equal(ergebnis.order.length, 2);
  });

  it("weist negative Positionen ab", () => {
    assert.equal(sortOrderSchema.safeParse({ order: [{ id: "a", sortOrder: -1 }] }).success, false);
  });
});

describe("Darstellung", () => {
  it("schreibt den Betrag mit der Währung des Tarifs", () => {
    assert.match(formatPlanPrice(25, "CHF"), /CHF/);
    assert.match(formatPlanPrice(25, "CHF"), /25/);
    assert.match(formatPlanPrice(50, "EUR"), /50/);
  });

  it("fällt ohne Währung auf Franken zurück, statt zu scheitern", () => {
    assert.match(formatPlanPrice(25, null), /CHF/);
    assert.match(formatPlanPrice(25, ""), /CHF/);
  });

  it("bricht bei einem unbekannten Code nicht ab", () => {
    assert.equal(typeof formatPlanPrice(25, "XYZ"), "string");
  });

  it("beschriftet den Knopf je nach Preis", () => {
    assert.equal(defaultCtaText(0), "Kostenlos starten");
    assert.equal(defaultCtaText(25), "Jetzt eintragen");
  });

  it("führt standardmässig ins Eintragsformular", () => {
    assert.equal(defaultCtaUrl("basic"), "/organisation-eintragen?plan=basic");
  });

  it("beschriftet jedes Abrechnungsintervall", () => {
    for (const intervall of ["YEARLY", "MONTHLY", "ONE_TIME"] as const) {
      assert.ok(BILLING_INTERVAL_LABELS[intervall]);
      assert.ok(BILLING_INTERVAL_SUFFIX[intervall]);
    }
  });
});
