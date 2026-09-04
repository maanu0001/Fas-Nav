import { jsonOk, parseBody, route } from "@/lib/api";
import { jsonError } from "@/lib/api";
import { notifyStaff } from "@/lib/notifications";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { contactSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Kontaktanfragen landen als Ticket im Support-System. */
export const POST = route(async (request) => {
  const limit = checkRateLimit(clientKey(request, "contact"), 5, 15 * 60_000);
  if (!limit.ok) {
    return jsonError(
      "Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.",
      429,
    );
  }

  const body = await parseBody(request, contactSchema);

  // Honeypot: Bots füllen dieses Feld aus – wir antworten unauffällig mit Erfolg.
  if (body.website) {
    return jsonOk({ ticketNumber: 0 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: body.subject,
      category: "CONTACT",
      priority: "NORMAL",
      status: "OPEN",
      guestName: body.name,
      guestEmail: body.email,
      messages: {
        create: {
          body: body.message,
          authorName: body.name,
        },
      },
    },
    select: { id: true, number: true, subject: true },
  });

  await notifyStaff({
    type: "SYSTEM",
    title: `Neue Kontaktanfrage #${ticket.number}`,
    body: `${body.name} (${body.email}): ${body.subject}`,
    link: `/dashboard/tickets/${ticket.id}`,
  });

  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL;
  if (notifyEmail) {
    await sendMail({
      to: notifyEmail,
      subject: `[Fas-Nav] Kontaktanfrage #${ticket.number}: ${body.subject}`,
      text: `Von: ${body.name} <${body.email}>\n\n${body.message}`,
    });
  }

  return jsonOk({ ticketNumber: ticket.number }, 201);
});
