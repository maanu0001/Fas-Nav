import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CLAIM_REQUEST_STATUS_LABELS,
  OPEN_CLAIM_REQUEST_STATUSES,
  OPEN_CONTACT_TICKET_STATUSES,
} from "@/lib/constants";
import {
  CONTACT_TICKET_WHERE,
  claimRequestWhere,
  contactTicketWhere,
  isOpenClaimRequest,
} from "@/lib/queries/contact-requests";
import { can } from "@/lib/rbac";
import { claimRequestUpdateSchema } from "@/lib/validation/schemas";

/**
 * Tests des Bereichs Kontaktanfragen.
 *
 * Zwei Punkte sind hier wesentlich: Die beiden Anfragearten dürfen sich nicht
 * vermischen, und der Zugriff gehört ausschliesslich ADMIN und TEAM.
 */

/** Sammelt alle Feldnamen mit einer `contains`-Bedingung. */
function suchfelder(where: unknown, pfad = "", gefunden = new Set<string>()): Set<string> {
  if (!where || typeof where !== "object") return gefunden;
  if (Array.isArray(where)) {
    for (const eintrag of where) suchfelder(eintrag, pfad, gefunden);
    return gefunden;
  }
  for (const [schluessel, wert] of Object.entries(where as Record<string, unknown>)) {
    if (schluessel === "contains") gefunden.add(pfad);
    else suchfelder(wert, schluessel === "OR" || schluessel === "AND" || schluessel === "some" ? pfad : schluessel, gefunden);
  }
  return gefunden;
}

describe("Wer Kontaktanfragen bearbeiten darf", () => {
  it("ADMIN und TEAM, sonst niemand", () => {
    assert.equal(can("ADMIN", "handleContactRequests"), true);
    assert.equal(can("TEAM", "handleContactRequests"), true);
    assert.equal(can("FASNACHT", "handleContactRequests"), false);
    assert.equal(can("GUGGE", "handleContactRequests"), false);
    assert.equal(can(null, "handleContactRequests"), false);
    assert.equal(can(undefined, "handleContactRequests"), false);
  });
});

describe("Trennung der beiden Anfragearten", () => {
  it("Kontaktanfragen sind ausschliesslich Tickets aus dem Formular", () => {
    assert.deepEqual(CONTACT_TICKET_WHERE, { category: "CONTACT" });
  });

  it("die Kategorie bleibt auch mit Suche und Filter bestehen", () => {
    const where = contactTicketWhere({ q: "Marie", status: "OPEN" });
    const text = JSON.stringify(where);
    assert.ok(text.includes('"category":"CONTACT"'), "Die Kategorie fehlt");
    assert.ok(text.includes('"status":"OPEN"'), "Der Statusfilter fehlt");
    assert.ok(text.includes('"contains":"Marie"'), "Der Suchbegriff fehlt");
  });

  it("Übernahmeanfragen kennen keine Ticketkategorie", () => {
    const text = JSON.stringify(claimRequestWhere({ q: "Hans" }));
    assert.ok(!text.includes("CONTACT"), "Eine Übernahmeanfrage ist kein Ticket");
  });
});

describe("Suche im Kontaktformular", () => {
  it("deckt Name, E-Mail, Betreff und Nachricht ab", () => {
    const felder = suchfelder(contactTicketWhere({ q: "Muster" }));
    for (const feld of ["subject", "guestName", "guestEmail", "body"]) {
      assert.ok(felder.has(feld), `Feld ${feld} fehlt in der Suche`);
    }
  });

  it("ignoriert Leerzeichen am Rand", () => {
    const text = JSON.stringify(contactTicketWhere({ q: "  Muster  " }));
    assert.ok(text.includes('"contains":"Muster"'));
  });

  it("sucht ohne Rücksicht auf Gross-/Kleinschreibung", () => {
    assert.ok(JSON.stringify(contactTicketWhere({ q: "muster" })).includes('"insensitive"'));
  });

  it("baut ohne Begriff keine Suchbedingung", () => {
    const text = JSON.stringify(contactTicketWhere({}));
    assert.ok(!text.includes("contains"));
  });
});

describe("Suche bei Übernahmeanfragen", () => {
  it("deckt Name, E-Mail, Nachricht und Organisation ab", () => {
    const felder = suchfelder(claimRequestWhere({ q: "Seebüebe" }));
    for (const feld of ["contactName", "contactEmail", "message", "name", "slug"]) {
      assert.ok(felder.has(feld), `Feld ${feld} fehlt in der Suche`);
    }
  });

  it("liefert ohne Suche und Filter eine leere Bedingung", () => {
    assert.deepEqual(claimRequestWhere({}), {});
  });

  it("nimmt den Statusfilter auf", () => {
    assert.ok(JSON.stringify(claimRequestWhere({ status: "APPROVED" })).includes("APPROVED"));
  });
});

describe("Bearbeitungsstand einer Übernahmeanfrage", () => {
  it("kennt genau die vier vorgesehenen Werte", () => {
    assert.deepEqual(Object.keys(CLAIM_REQUEST_STATUS_LABELS), [
      "PENDING",
      "IN_REVIEW",
      "APPROVED",
      "REJECTED",
    ]);
  });

  it("nimmt nur bekannte Werte an", () => {
    for (const wert of ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"]) {
      assert.equal(claimRequestUpdateSchema.safeParse({ status: wert }).success, true, wert);
    }
    for (const wert of ["ERLEDIGT", "", "approved", "DROP TABLE"]) {
      assert.equal(claimRequestUpdateSchema.safeParse({ status: wert }).success, false, wert);
    }
  });

  it("gilt als unerledigt, solange nicht entschieden ist", () => {
    assert.equal(isOpenClaimRequest("PENDING"), true);
    assert.equal(isOpenClaimRequest("IN_REVIEW"), true);
    assert.equal(isOpenClaimRequest("APPROVED"), false);
    assert.equal(isOpenClaimRequest("REJECTED"), false);
    // Ein unbekannter Wert aus alten Daten zählt nicht als offen.
    assert.equal(isOpenClaimRequest("IRGENDWAS"), false);
  });

  it("die Zählerlisten decken sich mit den offenen Zuständen", () => {
    assert.deepEqual(OPEN_CLAIM_REQUEST_STATUSES, ["PENDING", "IN_REVIEW"]);
    assert.deepEqual([...OPEN_CONTACT_TICKET_STATUSES], [
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_CUSTOMER",
    ]);
  });
});
