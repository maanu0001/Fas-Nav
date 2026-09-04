# Fas-Nav.ch

**Die zentrale digitale Plattform für Fasnacht in der Schweiz.**

Fas-Nav.ch bündelt Fasnachten, Guggenmusiken, Umzüge und Fasnachtsveranstaltungen
der ganzen Schweiz an einem Ort – für Besucherinnen und Besucher kostenlos, für
Organisationen als selbst verwaltete Profilseite mit Anschluss an eine
schweizweite Agenda.

---

## Inhalt

1. [Funktionsumfang](#funktionsumfang)
2. [Architektur](#architektur)
3. [Schnellstart](#schnellstart)
4. [Umgebungsvariablen](#umgebungsvariablen)
5. [Seed-Zugangsdaten](#seed-zugangsdaten)
6. [Deployment](#deployment)
7. [Rollen und Berechtigungen](#rollen-und-berechtigungen)
8. [Sicherheit](#sicherheit)
9. [Projektstruktur](#projektstruktur)
10. [Nächste Ausbauschritte](#nächste-ausbauschritte)

---

## Funktionsumfang

### Öffentlicher Bereich

| Route | Inhalt |
| --- | --- |
| `/` | Startseite, vollständig über das Homepage-CMS pflegbar |
| `/agenda` | Schweizweite Fasnachtsagenda als Listen- und Kalenderansicht |
| `/fasnachten` | Fasnachtsverzeichnis mit Filtern |
| `/guggen` | Guggenverzeichnis mit Filtern |
| `/fasnacht/[slug]` | Öffentliche Fasnachtsseite |
| `/gugge/[slug]` | Öffentliche Guggenseite |
| `/event/[slug]` | Veranstaltungsseite mit strukturierten Daten |
| `/kanton/[slug]` | Kantons-Landingpage (SEO) |
| `/kantone` | Übersicht aller 26 Kantone nach Region |
| `/suche` | Globale Suche über Organisationen, Events und Orte |
| `/preise` | Tarifvergleich, vollständig aus der Datenbank |
| `/organisation-eintragen` | Aufnahmeformular für Organisationen |
| `/profil-uebernehmen/[slug]` | Übernahme eines vorangelegten Profils |
| `/kontakt` | Kontaktformular, erzeugt ein Support-Ticket |
| `/impressum` `/datenschutz` `/agb` `/cookies` | Rechtliche Seiten |

Filter der Agenda: Datum (von/bis), Kanton, Region, Ort, Veranstaltungstyp und
Veranstaltertyp. Vergangene Veranstaltungen verschwinden automatisch aus der
Ansicht „kommend“.

### Dashboard – Admin und Team

Kennzahlen (Organisationen, Accounts, Tickets, Abos, offene Zahlungen),
Homepage-CMS, Organisationsverwaltung, plattformweite Agenda, Accountverwaltung,
Abonnemente, Zahlungen mit automatischer Rechnungsnummer, Ticketsystem,
Werbeplatzierungen, Statistik, Medienübersicht, Audit-Log und
Plattform-Einstellungen.

### Dashboard – Fasnachten und Guggen

Übersicht mit Profilvollständigkeit, geführtes Onboarding in neun Schritten,
**Live-Editor mit Vorschau**, Veranstaltungsverwaltung, Galerie, Statistik,
Abonnement mit Rechnungshistorie, Tickets und Kontoeinstellungen.

### Datenimport (Admin und Team)

Recherchierte Fasnachten und Guggen lassen sich als JSON-Datei übernehmen –
unter `/dashboard/import`, ausschliesslich für Admin und Team.

Der Assistent führt in vier Schritten: Datei prüfen, Vorschau ansehen,
Einstellungen wählen, importieren. Der Import startet nie unmittelbar nach dem
Upload, sondern erst nach ausdrücklicher Bestätigung.

Eigenschaften:

* **Wiederholbar.** Jede Organisation trägt die `externalImportId` aus der
  Recherchedatei. Ein erneuter Import derselben Datei erzeugt keine Duplikate,
  sondern aktualisiert die vorhandenen Datensätze.
* **Dublettenerkennung in sieben Stufen** – von der Importkennung über Slug,
  Website und Name/Ort bis zu ähnlichen Namen. Eindeutige Treffer werden
  aktualisiert, unsichere niemals automatisch zusammengeführt.
* **Manuelle Bearbeitungen sind geschützt.** Wurde ein Feld von Hand geändert,
  überschreibt ein späterer Import es nicht. Der Konflikt wird mit aktuellem
  und Importwert angezeigt.
* **Importierte Profile sind „nicht beansprucht“.** Es entsteht kein
  Benutzerkonto; die öffentliche Seite kann trotzdem erscheinen.
* **Echter Probelauf.** Die Simulation verwendet dieselbe Logik wie der
  Import, schreibt aber nichts.
* **Rückgängig machen** entfernt ausschliesslich Datensätze, die der Lauf neu
  angelegt hat und die seither unverändert geblieben sind.
* **Protokolliert.** Jeder Lauf wird mit Ergebnis je Datensatz gespeichert und
  erscheint zusätzlich im Audit-Log.

### Querschnittsfunktionen

Veröffentlichungszustände (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`,
`UNPUBLISHED`, `SUSPENDED`), Verifizierung (`UNVERIFIED`, `VERIFIED`,
`OFFICIAL`), Übernahmestatus (`UNCLAIMED`, `CLAIM_REQUESTED`, `CLAIMED`),
Abo- und Tarifsystem mit Feature-Flags und Limits, Zahlungsstatus,
Benachrichtigungen (intern und per E-Mail), Audit-Log, Analytics ohne
Personenbezug sowie vollständige SEO-Ausstattung.

---

## Architektur

| Bereich | Umsetzung |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| Sprache | TypeScript im `strict`-Modus |
| Styling | Tailwind CSS mit eigenem Design-System |
| UI | Eigene Komponenten im shadcn/ui-Stil (`cva`, `tailwind-merge`) |
| Datenbank | PostgreSQL 16 |
| ORM | Prisma 6 mit Migrationen |
| Auth | Auth.js v5 (NextAuth), Credentials-Provider, JWT-Sessions, bcrypt |
| Validierung | Zod – ein Schema pro Anwendungsfall, serverseitig erzwungen |
| Bilder | `sharp`: Reencoding nach WebP, Grössenbegrenzung, Thumbnails |
| Speicher | Adapter-Schnittstelle (`local` implementiert, S3/R2 vorbereitet) |
| E-Mail | `nodemailer`; ohne SMTP-Konfiguration wird nur protokolliert |
| Betrieb | Docker (Multi-Stage, Standalone-Build), Docker Compose, Healthcheck |

### Schichtenmodell

```
src/app          Routen: öffentlich, Auth, Dashboard, REST-API
src/components   UI-Primitive, öffentliche Bausteine, Dashboard-Bausteine
src/lib          Fachlogik: RBAC, Validierung, Queries, Abos, Medien, SEO
prisma           Schema, Migrationen, Seed
```

Alle schreibenden Zugriffe laufen über REST-Route-Handler unter `src/app/api`.
Jeder Handler folgt derselben Reihenfolge:

```
Authentifizierung → Berechtigung → Validierung (Zod) → Fachlogik → Audit-Log
```

### Datenmodell

Kern-Entitäten: `User`, `Membership`, `Organization`, `Event`, `Location`,
`Canton`, `Municipality`, `Plan`, `Feature`, `PlanFeature`, `Subscription`,
`Payment`, `Placement`, `Ticket`, `TicketMessage`, `Media`, `SocialLink`,
`Sponsor`, `ProgramItem`, `Faq`, `Download`, `ClaimRequest`, `Notification`,
`PageView`, `SearchQuery`, `AuditLog`, `SiteSetting`, `HomepageSection`,
`Favorite`, `PasswordResetToken`.

Zwei Entscheidungen prägen das Modell:

* **`Membership` statt `user.organizationId`.** Eine Fasnacht oder Gugge kann
  beliebig viele Accounts haben – Präsidium, Marketing, Webmaster – jeweils mit
  eigener Rolle (`OWNER`, `EDITOR`, `VIEWER`).
* **Eine `Organization` für beide Typen.** Fasnacht und Gugge unterscheiden sich
  über `type` und einige spezifische Felder, teilen aber Editor, Medien, Events,
  Abo und Rechteprüfung. Das vermeidet doppelten Code.

---

## Schnellstart

### Variante A – mit Docker (empfohlen)

```bash
cp .env.example .env
# AUTH_SECRET erzeugen und in .env eintragen:
openssl rand -base64 32

docker compose up -d --build
docker compose run --rm migrate                        # Migrationen anwenden
docker compose run --rm migrate npx tsx prisma/seed.ts # Seed-Daten einspielen
```

Anwendung: <http://localhost:3000>

Datenbankbefehle laufen im Dienst `migrate` und nicht im Anwendungscontainer:
Das Laufzeit-Image enthält nur, was zum Ausliefern der Anwendung nötig ist,
und kann die Prisma-CLI deshalb nicht ausführen.

### Variante B – lokal

Voraussetzungen: Node.js 22+, PostgreSQL 16+.

```bash
npm install
cp .env.example .env          # DATABASE_URL und AUTH_SECRET anpassen
npx prisma migrate deploy     # Schema anlegen
npm run db:seed               # Stammdaten und Beispielinhalte
npm run dev
```

### Nützliche Befehle

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktionsbuild (inkl. prisma generate)
npm run start        # Produktionsserver
npm run typecheck    # TypeScript prüfen
npm run lint         # ESLint
npm run db:migrate   # Migration erzeugen (Entwicklung)
npm run db:deploy    # Migrationen anwenden (Produktion)
npm run db:seed      # Seed-Daten einspielen
npm run db:studio    # Prisma Studio
```

---

## Umgebungsvariablen

Vollständige Liste mit Kommentaren in `.env.example`.

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `DATABASE_URL` | ja | PostgreSQL-Verbindung |
| `AUTH_SECRET` | ja | Signaturschlüssel der Sessions (`openssl rand -base64 32`) |
| `AUTH_URL` | ja (Produktion) | Öffentliche Basis-URL |
| `NEXT_PUBLIC_APP_URL` | ja | Basis-URL für canonical, OpenGraph und Sitemap |
| `AUTH_TRUST_HOST` | hinter Proxy | Auf `true` setzen |
| `STORAGE_DRIVER` | nein | `local` (Standard) |
| `UPLOAD_DIR` | nein | Zielverzeichnis für Uploads |
| `NEXT_PUBLIC_UPLOAD_BASE_URL` | nein | Öffentlicher Pfad der Uploads |
| `MAX_UPLOAD_SIZE_MB` | nein | Maximale Dateigrösse, Standard 8 |
| `SMTP_*`, `MAIL_FROM` | nein | E-Mail-Versand; ohne Angabe wird nur geloggt |
| `CONTACT_NOTIFY_EMAIL` | nein | Empfänger für Kontaktanfragen |
| `SEED_*` | nein | Zugangsdaten der Seed-Accounts |

---

## Seed-Zugangsdaten

> Ausschliesslich für Entwicklung und Test. Vor dem Produktivbetrieb ändern
> oder über `SEED_*` in `.env` überschreiben.

| Rolle | E-Mail | Passwort |
| --- | --- | --- |
| Admin | `admin@fas-nav.ch` | `Fasnacht2027!` |
| Team | `team@fas-nav.ch` | `Fasnacht2027!` |
| Fasnacht (Vollzugriff) | `oltner-fasnacht@example.ch` | `Fasnacht2027!` |
| Zwei Organisationen | `webmaster-olten@example.ch` | `Fasnacht2027!` |
| Gugge (Vollzugriff) | `chesslete@example.ch` | `Fasnacht2027!` |

Diese Konten zeigen beide Richtungen der Zuordnung:

* **Oltner Fasnacht** hat zwei Konten (`oltner-fasnacht@…` mit Vollzugriff,
  `webmaster-olten@…` mit Verwaltung).
* **`webmaster-olten@…`** hat Zugriff auf **zwei** Organisationen – Verwaltung
  bei der Oltner Fasnacht, Bearbeitung bei der Chesslete – und kann im
  Dashboard zwischen beiden wechseln.
* **Seebüebe Luzern** ist ein von Fas-Nav vorangelegtes Profil ohne Konto:
  öffentlich sichtbar, Status „nicht beansprucht“.

Der Seed legt ausserdem an: 26 Kantone, 11 Funktionen, 3 Tarife
(Verzeichnis/Basis/Premium), Homepage-Sektionen, Plattform-Einstellungen,
2 Fasnachten, 2 Guggen, 6 Veranstaltungen, Programm, Sponsoren, FAQ, Tickets
und bezahlte Rechnungen. Das Skript ist idempotent.

---

## Deployment

Produktiv deployed wird ausschliesslich aus dem Branch **`main`**.

### Automatisches Deployment über GitHub Actions

Der Workflow `.github/workflows/deploy-production.yml` läuft bei jedem Push auf
`main` und lässt sich zusätzlich von Hand auslösen.

1. **Prüfen und bauen** (`npm ci`, `npx prisma generate`, `npm run lint`,
   `npm run build`). Schlägt einer dieser Schritte fehl, wird **nicht**
   deployed.
2. **Ausrollen** per SSH auf den Produktionsserver nach `/opt/fas-nav/app`:
   `origin/main` auschecken, Images bauen, `prisma migrate deploy` ausführen,
   Container starten und anschliessend `/api/health` prüfen. Antwortet die
   Anwendung nicht, schlägt der Lauf fehl.

Zwei Deployments laufen nie gleichzeitig; ein zweiter Push wartet, bis der
vorherige Lauf beendet ist.

#### Benötigte GitHub-Secrets

| Secret | Zweck |
| --- | --- |
| `SERVER_HOST` | Hostname oder IP des Produktionsservers |
| `SERVER_USER` | Benutzer für das Deployment |
| `SERVER_SSH_KEY` | Privater SSH-Schlüssel (vollständig, inklusive Kopf- und Fusszeile) |
| `PRODUCTION_SSH_KNOWN_HOSTS` | Öffentlicher Hostschlüssel des Servers |

Der SSH-Port ist fest auf 22 gesetzt; dafür wird kein Secret benötigt.

##### Wert für `PRODUCTION_SSH_KNOWN_HOSTS` erzeugen

Der Workflow prüft den Hostschlüssel (`StrictHostKeyChecking=yes`) und weiss
deshalb, mit welchem Server er spricht. Ohne dieses Secret bricht das
Deployment mit einer klaren Meldung ab, statt die Prüfung stillschweigend zu
umgehen.

Den Wert auf einem Rechner erzeugen, der dem Server bereits vertraut – zum
Beispiel dem eigenen Arbeitsrechner, von dem aus du dich schon per SSH
verbindest:

```bash
ssh-keyscan fas-nav.ch          # Hostname oder IP wie in SERVER_HOST
```

Die vollständige Ausgabe (alle Zeilen, Kommentarzeilen mit `#` dürfen bleiben)
wird unverändert als Secret hinterlegt. Sie enthält nur öffentliche
Schlüssel – kein Geheimnis, aber sie muss aus vertrauenswürdiger Quelle
stammen, sonst ist die Prüfung wertlos.

Gegenprobe auf dem Server selbst, falls du sicher gehen willst:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Der Fingerabdruck muss mit dem übereinstimmen, den
`ssh-keyscan <host> | ssh-keygen -lf -` lokal ausgibt.

Ändert sich der Hostschlüssel des Servers – etwa nach einer Neuinstallation –,
schlägt das Deployment fehl und das Secret muss neu erzeugt werden.

Anwendungs-Secrets wie `AUTH_SECRET` oder `DATABASE_URL` gehören **nicht** zu
diesen Secrets. Sie liegen ausschliesslich in der `.env` auf dem
Produktionsserver und werden vom Deployment nicht angefasst.

#### Einmalige Einrichtung des Servers

```bash
sudo mkdir -p /opt/fas-nav
sudo git clone -b main https://github.com/maanu0001/Fas-Nav /opt/fas-nav/app
cd /opt/fas-nav/app
cp .env.example .env          # Produktionswerte eintragen, danach nie versionieren
```

Die `.env` sowie hochgeladene Dateien bleiben bei jedem Deployment erhalten:
Der Workflow gleicht den Stand mit `git reset --hard origin/main` ab und
verwendet bewusst **kein** `git clean`, das nicht versionierte Betriebsdateien
löschen würde.

### Manuelles Deployment mit Docker Compose

```bash
cp .env.example .env          # Produktionswerte eintragen

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE build --pull
$COMPOSE up -d db
$COMPOSE run --rm migrate     # Migrationen anwenden
$COMPOSE up -d
```

In der Produktionskonfiguration ist die Datenbank nicht nach aussen
veröffentlicht und die Anwendung lauscht auf `127.0.0.1:3000` – davor gehört ein
Reverse Proxy mit TLS.

#### Aufteilung der Compose-Dateien

| Datei | Rolle |
| --- | --- |
| `docker-compose.yml` | Dienste, Umgebung, Volumes – **ohne** veröffentlichte Ports |
| `docker-compose.override.yml` | Ports für die lokale Entwicklung; wird von `docker compose` automatisch geladen |
| `docker-compose.prod.yml` | Produktion: Anwendung nur auf `127.0.0.1:3000`, Datenbank gar nicht |

Compose hängt `ports` aus mehreren Dateien aneinander, statt sie zu ersetzen.
Eine Veröffentlichung in der Basisdatei liesse sich in der Produktion deshalb
nicht mehr zurücknehmen – auch ein `ports: []` im Overlay bewirkt nichts. Die
Basisdatei veröffentlicht darum gar nichts, und jede Umgebung legt selbst fest,
was sichtbar sein soll.

### Reverse Proxy (nginx, Beispiel)

```nginx
server {
    listen 443 ssl http2;
    server_name fas-nav.ch;

    client_max_body_size 12M;   # muss über MAX_UPLOAD_SIZE_MB liegen

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`X-Forwarded-For` weiterzureichen ist wichtig: Rate Limiting und die
pseudonyme Besucherzählung werten diesen Header aus.

### Checkliste vor dem Livegang

* `AUTH_SECRET` neu erzeugt, Seed-Passwörter geändert
* `NEXT_PUBLIC_APP_URL` und `AUTH_URL` auf die echte Domain gesetzt
* `AUTH_TRUST_HOST=true` hinter dem Proxy
* Migrationen angewendet (`npx prisma migrate deploy`)
* Sicherung für Datenbank **und** das Upload-Volume eingerichtet
* Healthcheck `GET /api/health` überwacht

### Betrieb

* **Healthcheck:** `GET /api/health` prüft die Datenbankverbindung
  (`200` gesund, `503` gestört); im Dockerfile als `HEALTHCHECK` hinterlegt.
* **Uploads** liegen im Volume `uploads` und werden über
  `/uploads/*` ausgeliefert. Diese Route wird zur Laufzeit bedient, da das
  `public/`-Verzeichnis von Next.js nur zum Build-Zeitpunkt eingelesen wird.
  Alternativ kann der Reverse Proxy `/uploads/` direkt vom Volume ausliefern.
* **Datensicherung:**
  `docker compose exec db pg_dump -U fasnav fasnav > backup.sql`

---

## Rollen und Berechtigungen

| Rolle | Rechte |
| --- | --- |
| `SUPERADMIN` | Wie Admin, für spätere Abstufungen vorgesehen |
| `ADMIN` | Vollzugriff inklusive Team-Accounts, Tarifen und Einstellungen |
| `TEAM` | Wie Admin, **ohne** Team-/Admin-Accounts, Tarife und Einstellungen |
| `FASNACHT` | Kontotyp Fasnacht – Zugriff nur über zugewiesene Organisationen |
| `GUGGE` | Kontotyp Gugge – Zugriff nur über zugewiesene Organisationen |
| `VISITOR` | Vorbereitet für Besucherkonten (Favoriten) |

### Benutzerkonto und Organisation sind getrennt

Ein Benutzerkonto ist ausschliesslich ein Login. Der Zugriff auf eine konkrete
Fasnacht oder Gugge ergibt sich einzig aus einem Eintrag in `Membership`.
Die globalen Rollen `FASNACHT` und `GUGGE` gewähren für sich genommen
**keinerlei** Zugriff auf irgendeine Organisation – sie beschreiben nur die Art
des Kontos.

Daraus folgt:

* Eine Organisation kann beliebig viele Konten haben (Präsidium, Marketing,
  Webmaster …).
* Ein Konto kann Zugriff auf beliebig viele Organisationen haben – mit
  **unterschiedlicher** Berechtigung je Organisation.
* Eine Organisation kann ganz ohne Konto existieren (Status
  „nicht beansprucht“) und trotzdem öffentlich sichtbar sein.
* Ein Konto zu deaktivieren berührt weder die Organisation noch deren
  öffentliche Seite – und umgekehrt.

### Berechtigungen innerhalb einer Organisation

| Berechtigung | Inhalte bearbeiten | Veröffentlichen | Benutzer und Zugriffe |
| --- | :---: | :---: | :---: |
| `OWNER` (Vollzugriff) | ✓ | ✓ | ✓ |
| `MANAGER` (Verwaltung) | ✓ | ✓ | – |
| `EDITOR` (Bearbeitung) | ✓ | – | – |

Die Matrix der globalen Rechte liegt in `src/lib/rbac.ts` (`PERMISSIONS`), die
der organisationsinternen in `ORG_ROLE_CAPABILITIES`. Neue Fähigkeiten werden
ausschliesslich dort ergänzt.

---

## Sicherheit

* **Serverseitige Rechteprüfung.** Jeder schreibende Endpoint prüft
  Authentifizierung und Berechtigung, bevor er Daten anfasst. Die
  Frontend-Navigation blendet lediglich zusätzlich aus.
* **Mandantentrennung.** `requireOrganizationAccess(id, capability)` ist der
  einzige Weg zu organisationsgebundenen Daten. Der Zugriff wird ausschliesslich
  über die Membership hergeleitet – die globale Rolle eines Organisationskontos
  spielt dabei keine Rolle. Eine manipulierte Organisations-ID im Request führt
  zu `403`, niemals zu Zugriff auf fremde Daten. Unterressourcen (Events,
  Medien, Sponsoren, Programm, FAQ) sowie Zuweisungen werden zusätzlich gegen
  ihre Organisation geprüft; eine fremde Zuweisungs-ID ergibt `404`.
  Auch die aktive Organisation aus dem Cookie wird bei jeder Anfrage erneut
  gegen die Memberships geprüft und ist niemals selbst Grundlage einer
  Berechtigung.
* **Keine Rechteeskalation.** Statusfelder wie `verification`, `isFeatured`,
  `slug` und `claimStatus` werden aus Anfragen von Organisationsaccounts
  verworfen. `TEAM` kann keine Team- oder Adminkonten anlegen oder bearbeiten.
* **Ticket-Isolation.** Organisationen sehen ausschliesslich ihre eigenen
  Tickets; interne Notizen des Teams sind für sie unsichtbar und können von
  ihnen nicht gesetzt werden.
* **Passwörter** als bcrypt-Hash (12 Runden). Der Login vergleicht auch bei
  unbekannter Adresse gegen einen Dummy-Hash, um Benutzer-Enumeration zu
  erschweren. Reset-Tokens werden nur als SHA-256-Hash gespeichert, sind
  einmal verwendbar und verfallen nach 60 Minuten.
* **Rate Limiting** für Login, Passwort-Reset, Kontaktformular, Übernahme­anfragen,
  Uploads und Ticketerstellung.
* **Upload-Härtung.** Prüfung von MIME-Typ und Grösse, Verifikation des
  Bildinhalts durch `sharp`, vollständiges Reencoding nach WebP (entfernt
  Metadaten und eingebettete Nutzlasten), serverseitig erzeugte Dateinamen
  und Schutz vor Path Traversal beim Speichern **und** beim Ausliefern.
* **XSS.** React escapt standardmässig; zusätzlich werden HTML-Tags aus allen
  Freitextfeldern entfernt. URLs sind auf `http`/`https` beschränkt, wodurch
  `javascript:`-Links ausgeschlossen sind. Das Homepage-CMS arbeitet mit
  strukturierten Feldern statt freiem HTML.
* **SQL-Injection** ist durch Prisma und ausschliesslich parametrisierte
  Abfragen ausgeschlossen.
* **CSRF.** Auth.js schützt die Anmeldung mit CSRF-Token; Sessions liegen in
  `SameSite=Lax`-Cookies, `httpOnly` und in Produktion `secure`.
* **Fehlerausgaben** sind nach aussen generisch; Details bleiben im Serverlog.
* **Datenschutz (CH-DSG).** Es werden keine IP-Adressen im Klartext
  gespeichert. Die Besucherzählung verwendet einen täglich wechselnden,
  nicht rückrechenbaren Hashwert. Keine Marketing- oder Drittanbieter-Cookies.
* **Sicherheits-Header** (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) werden in `next.config.ts` gesetzt.

---

## Projektstruktur

```
prisma/
  schema.prisma            Datenmodell
  migrations/              Versionierte Migrationen
  seed.ts                  Stammdaten und Beispielinhalte

src/app/
  (public)/                Öffentlicher Bereich
  (auth)/                  Login, Passwort vergessen/zurücksetzen
  dashboard/               Geschützter Bereich, rollenabhängig
  api/                     REST-Endpoints
  sitemap.ts robots.ts     SEO

src/components/
  ui/                      Button, Card, Input, Dialog, Tabelle, Toast …
  public/                  Header, Footer, Cards, Kalender, Filter
  dashboard/               Shell, Statistik, Formulare, Live-Editor

src/lib/
  rbac.ts                  Rollen, Berechtigungen, Mandantentrennung
  claim-status.ts          Übernahmestatus im Einklang mit den Zuweisungen
  import/                  Recherchedateien: Validierung, Mapping, Dubletten,
                           Planung, Ausführung, Rollback, Feldherkunft
  validation/              Zod-Schemata
  queries/                 Wiederverwendbare Lesezugriffe
  subscription.ts          Tarif- und Feature-Logik
  media.ts storage.ts      Upload-Verarbeitung und Speicherabstraktion
  seo.ts                   Metadaten und strukturierte Daten
  audit.ts analytics.ts    Protokollierung und Statistik
```

---

## Nächste Ausbauschritte

1. **Bilder aus der Recherche übernehmen.** Logo- und Titelbild-URLs werden
   gespeichert, aber bewusst nicht automatisch heruntergeladen. Ein geführter
   Ablauf mit Rechteprüfung wäre der nächste Schritt.
2. **Feingranulare Zugriffsrechte.** `ORG_ROLE_CAPABILITIES` in
   `src/lib/rbac.ts` bildet die Berechtigungen als Matrix ab und lässt sich um
   weitere Fähigkeiten oder Rollen erweitern, ohne aufrufenden Code zu ändern.
3. **Zahlungsanbindung.** `Subscription` und `Payment` führen bereits
   `externalCustomerId`, `externalSubscriptionId` und `externalId`. Ein
   Stripe- oder Datatrans-Webhook lässt sich ohne Modelländerung ergänzen.
4. **Automatisierte Ablauf-Erinnerungen.** Die Felder `expiringNotifiedAt` und
   `expiredNotifiedAt` sind vorhanden; es fehlt ein täglicher Cron-Job, der
   30 Tage vor Ablauf erinnert und danach in den eingeschränkten Modus schaltet.
5. **Object Storage.** `StorageAdapter` in `src/lib/storage.ts` implementieren
   (S3 oder Cloudflare R2) und `STORAGE_DRIVER` umstellen.
6. **Besucherkonten und Favoriten.** Modell `Favorite` und Rolle `VISITOR`
   bestehen; es fehlen Registrierung und Oberfläche.
7. **Volltextsuche.** Aktuell `ILIKE`-basiert. Für grössere Datenmengen bietet
   sich ein PostgreSQL-`tsvector` mit deutschem Wörterbuch an.
8. **Kartenansicht.** `latitude`/`longitude` sind im Modell vorhanden, die
   Agenda liesse sich um eine Kartendarstellung erweitern.
9. **Mehrsprachigkeit.** Für die Romandie und das Tessin relevant; die
   Textbausteine sind bereits zentral gehalten.
10. **Automatisierte Tests.** Die Berechtigungslogik in `src/lib/rbac.ts` und die
   Abo-Limits in `src/lib/subscription.ts` sind die lohnendsten Kandidaten.
11. **Feineres Rechtesystem.** `PERMISSIONS` ist als Matrix angelegt und lässt
   sich zu granularen, pro Account vergebbaren Rechten ausbauen.

---

© Fas-Nav.ch – Mit Freude gemacht in der Schweiz.
