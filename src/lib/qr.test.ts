import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FEATURE_KEYS } from "@/lib/constants";
import {
  QR_TARGETS,
  findQrTarget,
  organizationPublicPath,
  qrFileName,
  qrTargetUrl,
} from "@/lib/qr";

/**
 * Tests des QR-Zielkatalogs.
 *
 * Geprüft wird vor allem, dass die Adressen der tatsächlichen Routenstruktur
 * folgen und dass genau die vorgesehenen Ziele ein Tarifmerkmal verlangen.
 */

describe("QR-Ziele", () => {
  const fasnacht = { type: "CARNIVAL" as const, slug: "oltner-fasnacht" };
  const gugge = { type: "GUGGE" as const, slug: "chesslete-olten" };

  it("bildet die vorhandene Routenstruktur ab", () => {
    assert.equal(organizationPublicPath(fasnacht), "/fasnacht/oltner-fasnacht");
    assert.equal(organizationPublicPath(gugge), "/gugge/chesslete-olten");
  });

  it("die Organisationsseite ist ohne Abonnement verfügbar", () => {
    const profil = findQrTarget("profile");
    assert.ok(profil);
    assert.equal(profil.feature, null);
    assert.equal(profil.hash, "");
  });

  it("die weiteren Ziele verlangen je ein vorhandenes Tarifmerkmal", () => {
    const erwartet: Record<string, string> = {
      program: FEATURE_KEYS.PROGRAM,
      events: FEATURE_KEYS.EVENTS,
      gallery: FEATURE_KEYS.GALLERY,
    };
    for (const [key, feature] of Object.entries(erwartet)) {
      assert.equal(findQrTarget(key)?.feature, feature, `Ziel ${key}`);
    }
  });

  it("jedes Ziel mit Tarifmerkmal springt zu einem Anker der Profilseite", () => {
    for (const target of QR_TARGETS) {
      if (!target.feature) continue;
      assert.ok(target.hash.startsWith("#"), `Ziel ${target.key} ohne Anker`);
    }
  });

  it("erzeugt absolute Adressen mit Anker", () => {
    const profil = findQrTarget("profile")!;
    const programm = findQrTarget("program")!;
    assert.ok(qrTargetUrl(fasnacht, profil).endsWith("/fasnacht/oltner-fasnacht"));
    assert.ok(qrTargetUrl(fasnacht, programm).endsWith("/fasnacht/oltner-fasnacht#programm"));
    assert.ok(qrTargetUrl(fasnacht, profil).startsWith("http"));
  });

  it("weist unbekannte Ziele ab", () => {
    assert.equal(findQrTarget("karte"), undefined);
    assert.equal(findQrTarget(""), undefined);
  });

  it("bildet brauchbare Dateinamen", () => {
    assert.equal(qrFileName("oltner-fasnacht", "profile", "png"), "fas-nav-qr-oltner-fasnacht.png");
    assert.equal(
      qrFileName("oltner-fasnacht", "gallery", "svg"),
      "fas-nav-qr-oltner-fasnacht-gallery.svg",
    );
  });
});
