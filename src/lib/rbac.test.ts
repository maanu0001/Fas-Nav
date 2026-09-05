import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PERMISSIONS, can, isAdmin, isStaff, STAFF_ROLES } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * Tests der Berechtigungsmatrix.
 *
 * Diese Regeln entscheiden über Zugriffe auf Zahlungen, den Datenimport, die
 * Startseite und das Datenqualitäts-Center. Ändert jemand die Matrix, sollen
 * diese Tests das sofort melden.
 */

const ROLLEN: Role[] = ["ADMIN", "TEAM", "FASNACHT", "GUGGE"];

describe("Rollen", () => {
  it("kennt genau vier Rollen", () => {
    assert.deepEqual(ROLLEN.length, 4);
  });

  it("Admin und Team haben plattformweiten Zugriff, Organisationskonten nicht", () => {
    assert.deepEqual(STAFF_ROLES, ["ADMIN", "TEAM"]);
    assert.equal(isStaff("ADMIN"), true);
    assert.equal(isStaff("TEAM"), true);
    assert.equal(isStaff("FASNACHT"), false);
    assert.equal(isStaff("GUGGE"), false);
    assert.equal(isAdmin("TEAM"), false);
    assert.equal(isAdmin("ADMIN"), true);
  });
});

describe("Berechtigungen je Rolle", () => {
  const nurAdmin = [
    "managePayments",
    "viewFinancialFigures",
    "reviewDataQuality",
    "manageHomepage",
    "importData",
    "manageSettings",
    "managePlans",
    "manageStaffAccounts",
  ] as const;

  for (const recht of nurAdmin) {
    it(`${recht}: nur ADMIN`, () => {
      assert.equal(can("ADMIN", recht), true);
      assert.equal(can("TEAM", recht), false);
      assert.equal(can("FASNACHT", recht), false);
      assert.equal(can("GUGGE", recht), false);
    });
  }

  const adminUndTeam = [
    "manageOrganizations",
    "manageAllEvents",
    "manageOrgAccounts",
    "manageSubscriptions",
    "viewAllTickets",
    "verifyOrganizations",
  ] as const;

  for (const recht of adminUndTeam) {
    it(`${recht}: ADMIN und TEAM`, () => {
      assert.equal(can("ADMIN", recht), true);
      assert.equal(can("TEAM", recht), true);
      assert.equal(can("FASNACHT", recht), false);
      assert.equal(can("GUGGE", recht), false);
    });
  }

  it("Organisationskonten erhalten über die globale Rolle kein Plattformrecht", () => {
    for (const recht of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      assert.equal(can("FASNACHT", recht), false, `FASNACHT sollte ${recht} nicht haben`);
      assert.equal(can("GUGGE", recht), false, `GUGGE sollte ${recht} nicht haben`);
    }
  });

  it("ohne Rolle besteht kein Zugriff", () => {
    assert.equal(can(null, "manageOrganizations"), false);
    assert.equal(can(undefined, "managePayments"), false);
  });
});
