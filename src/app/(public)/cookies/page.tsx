import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/public/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cookie-Einstellungen",
  description: "Welche Cookies Fas-Nav.ch verwendet und wie du sie steuern kannst.",
  path: "/cookies",
});

const COOKIES = [
  {
    name: "authjs.session-token",
    purpose: "Hält die Anmeldung am Dashboard aufrecht.",
    duration: "7 Tage",
    category: "Notwendig",
  },
  {
    name: "authjs.csrf-token",
    purpose: "Schützt Formulare vor Cross-Site-Request-Forgery.",
    duration: "Sitzung",
    category: "Notwendig",
  },
  {
    name: "authjs.callback-url",
    purpose: "Leitet nach der Anmeldung zur ursprünglich aufgerufenen Seite zurück.",
    duration: "Sitzung",
    category: "Notwendig",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie-Einstellungen">
      <p>
        Fas-Nav.ch verwendet bewusst so wenige Cookies wie möglich. Wir setzen{" "}
        <strong>keine Marketing-, Werbe- oder Tracking-Cookies von Drittanbietern</strong> ein. Es
        gibt daher nichts, dem du zustimmen oder widersprechen müsstest – alle eingesetzten Cookies
        sind für den Betrieb technisch notwendig.
      </p>

      <h2>Eingesetzte Cookies</h2>
      <div className="not-prose overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Name</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Zweck</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Dauer</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Kategorie</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((cookie) => (
              <tr key={cookie.name} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{cookie.name}</td>
                <td className="px-4 py-3 text-slate-700">{cookie.purpose}</td>
                <td className="px-4 py-3 text-slate-700">{cookie.duration}</td>
                <td className="px-4 py-3 text-slate-700">{cookie.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Statistik ohne Cookies</h2>
      <p>
        Für unsere Besuchsstatistik verwenden wir keine Cookies. Aufrufe werden serverseitig
        gezählt und mit einem täglich wechselnden, nicht rückrechenbaren Hashwert grob
        unterschieden. Ein Wiedererkennen einzelner Personen über längere Zeit ist damit nicht
        möglich.
      </p>

      <h2>Cookies im Browser verwalten</h2>
      <p>
        Du kannst Cookies jederzeit in den Einstellungen deines Browsers löschen oder blockieren.
        Beachte, dass die Anmeldung am Dashboard danach nicht mehr funktioniert.
      </p>

      <p>
        Weitere Informationen findest du in unserer{" "}
        <Link href="/datenschutz" className="text-primary-700 underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </LegalPage>
  );
}
