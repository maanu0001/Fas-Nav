import type { Prisma } from "@prisma/client";

import { startOfToday } from "@/lib/dates";
import { publicHrefFor } from "@/lib/editor-state";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, settingString } from "@/lib/queries/homepage";
import { absoluteUrl } from "@/lib/utils";
import {
  REMINDER_DEFAULTS,
  REMINDER_SETTING_KEYS,
  fillPlaceholders,
  pickRecipient,
  type ReminderPlaceholders,
  type ReminderResult,
  type ReminderSettings,
} from "@/lib/agenda-reminder";

/**
 * Ausführung des Erinnerungslaufs.
 *
 * Diese Datei spricht Datenbank und Mailversand an und gehört deshalb
 * ausschliesslich auf den Server. Der Lauf ist so gebaut, dass ein zweiter
 * Aufruf am selben Tag nichts zusätzlich verschickt: Massgeblich ist allein
 * `agendaReminderSentAt` auf der Organisation, und diese Marke wird gesetzt,
 * bevor die Mail hinausgeht. Ein doppelter Lauf findet die Organisation
 * danach in der Sperrfrist.
 */

export async function getReminderSettings(): Promise<ReminderSettings> {
  const settings = await getSiteSettings();
  const tage = Number(settings[REMINDER_SETTING_KEYS.cooldownDays]);

  return {
    enabled: settings[REMINDER_SETTING_KEYS.enabled] === "true",
    subject: settingString(settings, REMINDER_SETTING_KEYS.subject, REMINDER_DEFAULTS.subject),
    body: settingString(settings, REMINDER_SETTING_KEYS.body, REMINDER_DEFAULTS.body),
    // Ein unbrauchbarer Wert darf nicht zu einer Sperrfrist von null Tagen und
    // damit zu täglichen Mails führen.
    cooldownDays:
      Number.isFinite(tage) && tage >= 1
        ? Math.min(Math.round(tage), 365)
        : REMINDER_DEFAULTS.cooldownDays,
    ctaLabel: settingString(settings, REMINDER_SETTING_KEYS.ctaLabel, REMINDER_DEFAULTS.ctaLabel),
  };
}

/**
 * Bedingung für „hat kommende Veranstaltungen“.
 *
 * Bewusst dieselbe Auffassung wie die öffentliche Agenda: veröffentlicht und
 * noch nicht vorbei. Ein Termin gilt bis zu seinem Ende als kommend, bei
 * fehlendem Ende bis zum Beginn. Entwürfe und zurückgezogene Termine zählen
 * nicht, weil sie öffentlich nicht sichtbar sind. `startOfToday` rechnet in
 * der Zeitzone der Anwendung, ein heute laufender Termin zählt also noch.
 */
export function upcomingEventWhere(): Prisma.EventWhereInput {
  const heute = startOfToday();
  return {
    status: "PUBLISHED",
    OR: [{ endDate: { gte: heute } }, { endDate: null, startDate: { gte: heute } }],
  };
}

/**
 * Führt den Erinnerungslauf aus.
 *
 * Fehler beim Versand einer einzelnen Mail beenden den Lauf nicht; die
 * Organisation wird gezählt und der Lauf geht weiter. In die Protokollierung
 * gelangen nur Kennungen und Zahlen, keine Adressen und keine Mailinhalte.
 */
export async function runAgendaReminders(): Promise<ReminderResult> {
  const ergebnis: ReminderResult = {
    geprueft: 0,
    gesendet: 0,
    gesperrt: 0,
    ohneEmpfaenger: 0,
    fehlgeschlagen: 0,
    zurueckgesetzt: 0,
    abgeschaltet: false,
  };

  const einstellungen = await getReminderSettings();

  // Organisationen mit wieder gefüllter Agenda werden immer freigegeben – auch
  // wenn die Erinnerung insgesamt abgeschaltet ist. Sonst bliebe eine alte
  // Marke stehen und würde die nächste Erinnerung unnötig verzögern.
  const zurueckgesetzt = await prisma.organization.updateMany({
    where: {
      agendaReminderSentAt: { not: null },
      events: { some: upcomingEventWhere() },
    },
    data: { agendaReminderSentAt: null },
  });
  ergebnis.zurueckgesetzt = zurueckgesetzt.count;

  if (!einstellungen.enabled) {
    ergebnis.abgeschaltet = true;
    return ergebnis;
  }

  const grenze = new Date(Date.now() - einstellungen.cooldownDays * 24 * 60 * 60 * 1000);

  // Vor dem Lauf zählen: Danach wären die soeben markierten Organisationen
  // mitgezählt und die Zahl damit irreführend.
  ergebnis.gesperrt = await prisma.organization.count({
    where: {
      status: "PUBLISHED",
      events: { none: upcomingEventWhere() },
      agendaReminderSentAt: { gte: grenze },
    },
  });

  // Nur veröffentlichte Organisationen: Für Entwürfe und gesperrte Profile
  // wäre eine Aufforderung, Termine zu erfassen, sinnlos.
  const kandidaten = await prisma.organization.findMany({
    where: {
      status: "PUBLISHED",
      events: { none: upcomingEventWhere() },
      OR: [{ agendaReminderSentAt: null }, { agendaReminderSentAt: { lt: grenze } }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      agendaReminderSentAt: true,
      memberships: {
        select: {
          role: true,
          createdAt: true,
          user: { select: { email: true, name: true, isActive: true } },
        },
      },
    },
  });

  ergebnis.geprueft = kandidaten.length;

  for (const organisation of kandidaten) {
    const empfaenger = pickRecipient(organisation.memberships);
    if (!empfaenger) {
      // Ein Profil ohne zugeordnetes Konto kann niemand pflegen – überspringen,
      // ohne die Marke zu setzen, damit es später erreichbar bleibt.
      ergebnis.ohneEmpfaenger += 1;
      continue;
    }

    const werte: ReminderPlaceholders = {
      name: empfaenger.name,
      organizationName: organisation.name,
      profileUrl: absoluteUrl(publicHrefFor(organisation)),
      dashboardUrl: absoluteUrl("/dashboard"),
      eventCreateUrl: absoluteUrl("/dashboard/veranstaltungen/neu"),
    };

    try {
      // Die Marke wird vor dem Versand gesetzt. Ein doppelter Lauf findet die
      // Organisation dadurch bereits in der Sperrfrist und verschickt nichts
      // ein zweites Mal.
      await prisma.organization.update({
        where: { id: organisation.id },
        data: { agendaReminderSentAt: new Date() },
      });

      const versand = await sendMail({
        to: empfaenger.email,
        subject: fillPlaceholders(einstellungen.subject, werte),
        text: `${fillPlaceholders(einstellungen.body, werte)}\n\n${einstellungen.ctaLabel}: ${werte.eventCreateUrl}\n\nFreundliche Grüsse\nFas-Nav.ch`,
      });

      if (versand.sent) {
        ergebnis.gesendet += 1;
      } else if (versand.reason === "not_configured") {
        // Ohne Mailserver ist gar nichts passiert. Die Marke wird auf den
        // vorherigen Stand zurückgesetzt, sonst verbrauchte eine Umgebung ohne
        // SMTP die Sperrfrist, ohne dass je eine Erinnerung ankäme.
        await prisma.organization.update({
          where: { id: organisation.id },
          data: { agendaReminderSentAt: organisation.agendaReminderSentAt },
        });
        ergebnis.fehlgeschlagen += 1;
      } else {
        // Ein gescheiterter Versand behält die Marke: Ein dauerhaft
        // fehlerhaftes Postfach soll keinen täglichen Versuch auslösen.
        ergebnis.fehlgeschlagen += 1;
      }
    } catch (error) {
      ergebnis.fehlgeschlagen += 1;
      console.error(`[agenda-reminder] Organisation ${organisation.id}:`, error);
    }
  }

  return ergebnis;
}
