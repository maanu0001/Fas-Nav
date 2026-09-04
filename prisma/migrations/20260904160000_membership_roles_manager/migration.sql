-- Organisationsinterne Rollen: VIEWER entfällt, MANAGER kommt hinzu.
--
-- PostgreSQL erlaubt kein direktes Entfernen eines Enum-Werts. Der Typ wird
-- deshalb neu aufgebaut und die bestehenden Daten werden abgebildet:
--   OWNER  -> OWNER
--   EDITOR -> EDITOR
--   VIEWER -> EDITOR   (bisher rein lesend; EDITOR ist die engste verbleibende
--                       Rolle. Der Fall tritt in den bestehenden Daten nicht
--                       auf, die Abbildung ist zur Sicherheit dennoch definiert.)
-- Bestehende Zuordnungen bleiben vollständig erhalten.

CREATE TYPE "MembershipRole_new" AS ENUM ('OWNER', 'MANAGER', 'EDITOR');

ALTER TABLE "memberships" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "memberships"
  ALTER COLUMN "role" TYPE "MembershipRole_new"
  USING (
    CASE "role"::text
      WHEN 'VIEWER' THEN 'EDITOR'
      ELSE "role"::text
    END
  )::"MembershipRole_new";

DROP TYPE "MembershipRole";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";

ALTER TABLE "memberships" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
