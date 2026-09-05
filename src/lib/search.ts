import { Prisma } from "@prisma/client";
import type { EventType } from "@prisma/client";

import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Zentrale Volltextsuche für Agenda, Fasnachten und Guggen.
 *
 * Alle drei Bereiche bauen ihre Bedingung hier zusammen. Vorher stand die
 * Feldliste dreimal im Code, entsprechend unterschiedlich fielen die Treffer
 * aus. Diese Datei ist nun die einzige Stelle, an der entschieden wird, worin
 * gesucht wird.
 *
 * Wichtig für alle Aufrufer: Die Rückgabe ist eine einzelne Bedingung, die in
 * ein `AND` gehört – niemals als `OR`-Schlüssel direkt in ein Where-Objekt
 * gespreizt. Genau daran ist die Agenda gescheitert: Ein zweiter `OR`-Schlüssel
 * im selben Objektliteral überschreibt den ersten stillschweigend, die Suche
 * verschwand also spurlos und es blieben alle Termine sichtbar.
 */

/** Kürzeste Eingabe, ab der gesucht wird. Ein Zeichen genügt. */
export const MIN_SEARCH_LENGTH = 1;

/**
 * Bereinigt eine Eingabe für die Suche.
 *
 * Führende und schliessende Leerzeichen fallen weg, Folgen von Leerzeichen
 * werden zu einem einzelnen zusammengezogen. Gross-/Kleinschreibung bleibt
 * erhalten – darum kümmert sich die Datenbank über `mode: "insensitive"`,
 * das auch Umlaute korrekt behandelt.
 */
export function normalizeSearchTerm(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

/** Baut `{ feld: { contains, mode: "insensitive" } }` für eine Liste von Feldern. */
function containsAny<T>(term: string, fields: string[]): T[] {
  return fields.map((field) => {
    // Punktnotation erlaubt Felder verbundener Tabellen, z. B. "canton.name".
    const parts = field.split(".");
    const leaf: Record<string, unknown> = {
      [parts[parts.length - 1]]: { contains: term, mode: "insensitive" },
    };
    return parts
      .slice(0, -1)
      .reverse()
      .reduce<Record<string, unknown>>((acc, key) => ({ [key]: acc }), leaf) as T;
  });
}

/**
 * Veranstaltungstypen, deren deutsche Bezeichnung den Suchbegriff enthält.
 *
 * Damit findet „konzert“ auch Guggen- und Monsterkonzerte, obwohl der Typ in
 * der Datenbank als Aufzählungswert und nicht als Text liegt.
 */
export function matchingEventTypes(term: string): EventType[] {
  const needle = term.toLowerCase();
  if (needle.length < 3) return []; // Zu kurz – träfe sonst fast jeden Typ.
  return (Object.entries(EVENT_TYPE_LABELS) as [EventType, string][])
    .filter(([, label]) => label.toLowerCase().includes(needle))
    .map(([type]) => type);
}

/**
 * Suchbedingung für Veranstaltungen.
 *
 * Gesucht wird in Titel, Kurz- und Langbeschreibung, Ort, Lokal, Kanton und
 * Region sowie im Namen der veranstaltenden Organisation. Passt der Begriff
 * auf die Bezeichnung eines Veranstaltungstyps, gilt auch der als Treffer.
 */
export function eventSearchWhere(rawTerm: string): Prisma.EventWhereInput | null {
  const term = normalizeSearchTerm(rawTerm);
  if (term.length < MIN_SEARCH_LENGTH) return null;

  const types = matchingEventTypes(term);

  return {
    OR: [
      ...containsAny<Prisma.EventWhereInput>(term, [
        "title",
        "shortDescription",
        "description",
        "city",
        "venueName",
        "organizerName",
        "canton.name",
        "canton.region",
        "organization.name",
        "organization.shortName",
      ]),
      ...(types.length ? [{ type: { in: types } }] : []),
    ],
  };
}

/**
 * Suchbedingung für Organisationen ohne die Textfelder-Listen.
 *
 * `alternativeNames` ist eine Textliste in Postgres. Prisma kann darin nur
 * exakt vergleichen, nicht auf Teilzeichenketten – deshalb wird dieses eine
 * Feld getrennt behandelt, siehe `organizationSearchWhere`.
 */
function organizationTextWhere(term: string): Prisma.OrganizationWhereInput {
  return {
    OR: containsAny<Prisma.OrganizationWhereInput>(term, [
      "name",
      "shortName",
      "tagline",
      "shortDescription",
      "description",
      "city",
      "motto",
      "canton.name",
      "canton.region",
    ]),
  };
}

/**
 * Kennungen der Organisationen, deren Namensliste den Begriff enthält.
 *
 * Eine eigene Abfrage, weil Prisma auf Textlisten keine Teilzeichenkette
 * prüfen kann. `array_to_string` fügt die Liste zu einer Zeichenkette
 * zusammen, `ILIKE` sucht darin unabhängig von der Gross-/Kleinschreibung.
 * Die Tabelle ist klein und die Abfrage liefert nur Kennungen zurück; die
 * Obergrenze schützt vor einer übergrossen `IN`-Liste bei sehr kurzen
 * Begriffen.
 */
async function organizationIdsByAlternativeName(term: string): Promise<string[]> {
  const muster = `%${term.replace(/[\\%_]/g, (z) => `\\${z}`)}%`;
  const treffer = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM organizations
    WHERE array_to_string("alternativeNames", ' ') ILIKE ${muster}
    LIMIT 500
  `;
  return treffer.map((t) => t.id);
}

/**
 * Vollständige Suchbedingung für Organisationen.
 *
 * Deckt Name, Kurzname, weitere Namen, Ort, Kanton, Region und die
 * Beschreibungen ab. Das Ergebnis gehört in ein `AND`, damit es sich mit
 * Kanton-, Regions- und Gründungsfiltern kombinieren lässt.
 */
export async function organizationSearchWhere(
  rawTerm: string,
): Promise<Prisma.OrganizationWhereInput | null> {
  const term = normalizeSearchTerm(rawTerm);
  if (term.length < MIN_SEARCH_LENGTH) return null;

  const text = organizationTextWhere(term);
  const ids = await organizationIdsByAlternativeName(term);
  if (!ids.length) return text;

  return { OR: [...(text.OR as Prisma.OrganizationWhereInput[]), { id: { in: ids } }] };
}
