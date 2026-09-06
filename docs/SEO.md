# SEO auf Fas-Nav.ch

Diese Notiz beschreibt, wie Fas-Nav.ch für Suchmaschinen aufgebaut ist und
welche Regeln gelten. Sie richtet sich an alle, die am öffentlichen Bereich
arbeiten.

Vorweg, damit keine falschen Erwartungen entstehen: Technisches SEO verbessert
Crawlbarkeit, Verständnis und die Chancen auf gute Platzierungen. Eine bestimmte
Position bei Google lässt sich damit nicht herstellen und wird hier auch nicht
versprochen.

## Seitentypen und Indexierung

| Adresse | Im Index | Bemerkung |
|---|---|---|
| `/` | ja | Einstieg und interner Verteiler |
| `/fasnachten`, `/guggen`, `/agenda` | ja | Verzeichnisse |
| `/kantone`, `/kanton/[slug]` | ja | regionale Einstiegsseiten |
| `/fasnacht/[slug]`, `/gugge/[slug]` | nur mit Substanz | siehe Indexierbarkeit |
| `/event/[slug]` | ja | veröffentlicht und Organisation veröffentlicht |
| `/preise`, `/organisation-eintragen` | ja | |
| `/impressum`, `/datenschutz`, `/agb`, `/cookies` | ja | normal erreichbar, kein Sonderfall |
| `/suche` | nein | interne Suchergebnisse, zusätzlich in robots.txt gesperrt |
| `/profil-uebernehmen/[slug]` | nein | Formular ohne eigenständigen Inhalt |
| `/login`, `/passwort-*` | nein | |
| `/dashboard/*`, `/api/*` | nein | in robots.txt gesperrt |

## Indexierbarkeit von Profilen

`src/lib/indexability.ts` ist die einzige Stelle, an der entschieden wird, ob
ein Profil in den Index gehört. Seite, Sitemap und Tests fragen dieselbe
Funktion — nur so können sie nicht auseinanderlaufen.

Zwei Fragen werden getrennt beantwortet:

1. **Ist die Seite öffentlich?** Entscheidet der Veröffentlichungsstatus.
2. **Lohnt sich die Indexierung?** Entscheidet der Inhalt.

Für die zweite Frage zählt eine einfache Punktzahl (`MIN_INDEX_SCORE`, aktuell 3):

| Merkmal | Punkte |
|---|---|
| Beschreibung ab 120 Zeichen | 2 |
| Beschreibung ab 40 Zeichen | 1 |
| Website hinterlegt | 1 |
| Logo oder Titelbild | 1 |
| mindestens eine Veranstaltung | 2 |
| mindestens ein Social-Media-Verweis | 1 |
| mindestens ein Bild in der Galerie | 1 |

Name und Ort sind Voraussetzung, geben aber keine Punkte — die hat jeder
importierte Datensatz.

Ein Profil unterhalb der Schwelle bleibt **öffentlich erreichbar und intern
verlinkt**. Es trägt `noindex, follow` und fehlt in der Sitemap. Sobald die
Organisation ihr Profil ausbaut, kippt die Entscheidung von allein.

**Der Übernahmestatus spielt keine Rolle.** Ein importiertes, noch nicht
beanspruchtes Profil ist für Suchende genauso nützlich wie ein beanspruchtes,
solange es Substanz hat.

## Metadata

Alles läuft über `buildMetadata` in `src/lib/seo.ts`: Titel, Beschreibung,
Canonical, Open Graph, Twitter-Karte und das Robots-Meta. Es gibt keine zweite
Stelle, an der Metadata entsteht.

- Detailseiten erzeugen ihre Metadata in `generateMetadata` aus echten Daten.
- Fehlt eine Beschreibung, greift ein Textbaustein aus vorhandenen Feldern —
  Name, Ort, Kanton. Nie ein leeres `description`.
- Fehlt ein Bild, greift `/brand/og-default.png`.
- Der Markenname hängt über die Vorlage des Wurzel-Layouts hinten an. Ein
  Seitentitel darf ihn deshalb nicht zusätzlich enthalten.

## Canonical und Adressparameter

`listCanonical` in `src/lib/seo.ts` entscheidet für Verzeichnisse:

- **Blättern** erzeugt eine eigene Seite. `?page=2` bekommt ein Canonical auf
  sich selbst und bleibt im Index. Verwiese es auf Seite 1, würden die
  Einträge von Seite 2 nie eigenständig bewertet.
- **Jeder andere Parameter** — Suche, Kanton, Region, Sortierung, Ansicht —
  erzeugt eine Auswahl, keine neue Seite. Diese Adressen zeigen per Canonical
  auf die unveränderte Liste und tragen `noindex, follow`. Das Canonical allein
  wäre eine Empfehlung; erst `noindex` verhindert zuverlässig, dass der Index
  mit Filterkombinationen zuwächst.

`follow` bleibt überall erhalten, wo Inhalte verlinkt sind. Nur wirklich
private Seiten setzen zusätzlich `nofollow`.

## Strukturierte Daten

Erzeugt in `src/lib/seo.ts`, serverseitig gerendert, über `jsonLdScript`
sicher serialisiert (`<` wird maskiert).

| Seitentyp | Schema |
|---|---|
| Startseite | `WebSite` |
| Fasnachtprofil | `Organization` + `BreadcrumbList` |
| Guggeprofil | `MusicGroup` + `BreadcrumbList` |
| Veranstaltung | `Event` + `BreadcrumbList` |
| Kantonsseite | `BreadcrumbList` |

Ausgegeben wird nur, was tatsächlich in den Daten steht. Optionale Felder
fehlen lieber, als dass sie geraten werden. `sameAs` enthält ausschliesslich
tatsächlich hinterlegte Verweise.

## Sitemap

`src/app/sitemap.ts`, zur Laufzeit erzeugt (`force-dynamic`) — ein Prerendering
zur Build-Zeit würde einen veralteten Stand festschreiben.

Enthalten sind die festen Seiten, alle Kantone, alle **indexierbaren** Profile
und alle veröffentlichten kommenden Veranstaltungen. `lastmod` kommt aus
`updatedAt`, nicht aus der aktuellen Uhrzeit.

Fehlt ein Profil in der Sitemap, ist das kein Fehler der Sitemap, sondern die
Antwort auf `isIndexableOrganization` — dieselbe, die auch das Robots-Meta der
Seite setzt.

## robots.txt

`src/app/robots.ts`. Gesperrt sind `/dashboard`, `/api/`, `/login`,
`/passwort-vergessen`, `/passwort-zuruecksetzen` und `/suche`. Alles andere ist
frei. Die `Host`-Direktive ist bewusst nicht enthalten: Google wertet sie nicht
aus, und die bevorzugte Adresse steht im Canonical jeder Seite.

## Was hier nicht gelöst werden kann

Diese Punkte liegen ausserhalb der Anwendung und müssen organisatorisch
erfolgen:

- **www auf non-www.** Gehört auf die DNS- beziehungsweise Reverse-Proxy-Ebene
  vor der Anwendung.
- **Inhaltliche Tiefe.** Die Indexierbarkeitsregel misst Substanz, sie erzeugt
  keine. Profile werden erst durch die Organisationen selbst stark.
- **Verweise von aussen.** Verbandsseiten, lokale Medien, Vereinsseiten.
- **Aktualität über die Saison.** Fasnacht ist saisonal; die Agenda lebt davon,
  dass Termine früh erfasst werden.

## Grundsätze

Keine Doorway Pages, keine automatisch erzeugten Ortsseiten ohne eigenen
Nutzwert, keine Keyword-Listen, keine erfundenen strukturierten Daten. Alles,
was Suchmaschinen sehen, steht so auch auf der Seite.
