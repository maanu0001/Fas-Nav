import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Building2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/public/contact-form";
import { getSiteSettings, settingString } from "@/lib/queries/homepage";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Kontakt",
  description:
    "Fragen zu Fas-Nav.ch, zu einem Eintrag oder zum Abonnement? Schreibe uns – wir helfen gerne weiter.",
  path: "/kontakt",
});

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const email = settingString(settings, "contact_email", "info@fas-nav.ch");
  const operator = settingString(settings, "operator_name", "Fas-Nav.ch");

  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Kontakt</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Ob Frage zu deinem Eintrag, technisches Problem oder Interesse an einer Zusammenarbeit –
          wir freuen uns über deine Nachricht.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-8">
              <ContactForm />
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Mail className="h-4 w-4 text-accent-700" aria-hidden />
                E-Mail
              </h2>
              <a
                href={`mailto:${email}`}
                className="mt-2 block break-all text-sm text-primary-700 hover:underline"
              >
                {email}
              </a>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <MessageSquare className="h-4 w-4 text-accent-700" aria-hidden />
                Du hast bereits ein Konto?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Erfasse dein Anliegen direkt als Support-Ticket in deinem Dashboard. So siehst du
                jederzeit den aktuellen Bearbeitungsstand.
              </p>
              <Link
                href="/dashboard/tickets/neu"
                className="mt-3 inline-block text-sm font-semibold text-primary-700 hover:underline"
              >
                Ticket erstellen →
              </Link>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Building2 className="h-4 w-4 text-accent-700" aria-hidden />
                Betreiberin
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{operator}</p>
              <a
                href="/impressum"
                className="mt-2 inline-block text-sm font-semibold text-primary-700 hover:underline"
              >
                Impressum →
              </a>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
