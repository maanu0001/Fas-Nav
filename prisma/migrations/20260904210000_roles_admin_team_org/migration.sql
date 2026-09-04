-- Rollenmodell auf ADMIN, TEAM, FASNACHT und GUGGE reduzieren.
--
-- SUPERADMIN und VISITOR waren im Rollenmodell vorgesehen, aber ohne eigene
-- Funktion: SUPERADMIN verhielt sich identisch zu ADMIN, VISITOR gewährte
-- keinerlei Rechte.
--
-- Reihenfolge ist wichtig: Zuerst werden vorhandene Datensätze überführt,
-- erst danach wird der Aufzählungstyp umgebaut. So schlägt die Migration
-- auch dann nicht fehl, wenn Konten mit den entfallenden Rollen existieren.

-- Vorhandene Konten überführen. SUPERADMIN hatte faktisch Adminrechte und
-- behält sie; VISITOR hatte keine Rechte und wird zum Kontotyp Fasnacht,
-- der für sich genommen ebenfalls keinen Zugriff auf eine Organisation
-- gewährt – der ergibt sich einzig aus einem Eintrag in "Membership".
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" = 'SUPERADMIN';
UPDATE "users" SET "role" = 'FASNACHT' WHERE "role" = 'VISITOR';

-- Der Standardwert verweist noch auf den alten Typ und muss vor dem Umbau
-- weichen. Die Rolle wird künftig beim Anlegen bewusst gesetzt.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

-- Aufzählungstyp neu aufbauen.
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'TEAM', 'FASNACHT', 'GUGGE');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
