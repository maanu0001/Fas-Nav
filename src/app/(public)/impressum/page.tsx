import type { Metadata } from "next";

import { LegalPage } from "@/components/public/legal-page";
import { getSiteSettings, settingString } from "@/lib/queries/homepage";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Impressum",
  description: "Impressum und Angaben zur Betreiberin von Fas-Nav.ch.",
  path: "/impressum",
});

export default async function ImprintPage() {
  const settings = await getSiteSettings();

  const operator = settingString(settings, "operator_name", "Fas-Nav.ch");
  const address = settingString(settings, "operator_address", "Adresse bitte im Dashboard ergänzen");
  const zipCity = settingString(settings, "operator_zip_city", "");
  const email = settingString(settings, "contact_email", "info@fas-nav.ch");
  const phone = settingString(settings, "operator_phone", "");
  const uid = settingString(settings, "operator_uid", "");

  return (
    <LegalPage title="Impressum">
      <h2>Verantwortlich für den Inhalt dieser Website</h2>
      <p>
        {operator}
        <br />
        {address}
        {zipCity ? (
          <>
            <br />
            {zipCity}
          </>
        ) : null}
        <br />
        Schweiz
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{" "}
        <a href={`mailto:${email}`} className="text-primary-700 underline">
          {email}
        </a>
        {phone ? (
          <>
            <br />
            Telefon: {phone}
          </>
        ) : null}
        {uid ? (
          <>
            <br />
            UID: {uid}
          </>
        ) : null}
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        Die Inhalte dieser Website werden mit grösstmöglicher Sorgfalt erstellt. Angaben zu
        Veranstaltungen, Fasnachten und Guggenmusiken stammen jedoch überwiegend von den jeweiligen
        Organisationen selbst. Für Richtigkeit, Vollständigkeit und Aktualität dieser Angaben kann
        keine Gewähr übernommen werden. Massgebend sind stets die Informationen der jeweiligen
        Veranstalterin.
      </p>
      <p>
        Haftungsansprüche wegen Schäden materieller oder immaterieller Art, die aus der Nutzung
        oder Nichtnutzung der veröffentlichten Informationen entstehen, sind ausgeschlossen, soweit
        kein vorsätzliches oder grobfahrlässiges Verschulden vorliegt.
      </p>

      <h2>Verweise auf Websites Dritter</h2>
      <p>
        Diese Website enthält Links zu externen Websites Dritter. Auf deren Inhalte haben wir
        keinen Einfluss; für diese ist ausschliesslich die jeweilige Betreiberin verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die Urheber- und alle anderen Rechte an Inhalten dieser Website gehören der Betreiberin
        oder den jeweils genannten Rechteinhaberinnen und Rechteinhabern. Von Organisationen
        hochgeladene Logos, Bilder und Texte verbleiben im Eigentum der jeweiligen Organisation.
        Eine Vervielfältigung bedarf der vorgängigen schriftlichen Zustimmung.
      </p>
    </LegalPage>
  );
}
