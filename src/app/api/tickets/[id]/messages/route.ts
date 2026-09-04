import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { notify, notifyOrganization, notifyStaff } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStaff, requireUser } from "@/lib/rbac";
import { getVisibleTicket } from "@/lib/queries/tickets";
import { ticketMessageSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Antwort in einem Ticket erfassen. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser();

    // Sichtbarkeitsprüfung: fremde Tickets liefern 404 statt 403,
    // damit deren Existenz nicht preisgegeben wird.
    const ticket = await getVisibleTicket(id, user);
    if (!ticket) return jsonError("Ticket nicht gefunden.", 404);

    if (ticket.status === "CLOSED" && !isStaff(user.role)) {
      return jsonError(
        "Dieses Ticket ist geschlossen. Bitte erstelle bei Bedarf ein neues Ticket.",
        409,
      );
    }

    const body = await parseBody(request, ticketMessageSchema);
    const staff = isStaff(user.role);

    // Interne Notizen sind ausschliesslich Admin und Team vorbehalten.
    const isInternal = staff ? body.isInternal : false;

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        authorName: user.name ?? null,
        body: body.body,
        isInternal,
      },
      select: { id: true, body: true, isInternal: true, createdAt: true },
    });

    await prisma.ticket.update({
      where: { id },
      data: {
        lastReplyAt: new Date(),
        // Antwortet das Team, wartet das Ticket auf die Organisation – und umgekehrt.
        ...(isInternal
          ? {}
          : staff
            ? { status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status }
            : { status: "OPEN" }),
      },
    });

    if (!isInternal) {
      if (staff) {
        if (ticket.organizationId) {
          await notifyOrganization(ticket.organizationId, {
            type: "TICKET_REPLY",
            title: `Antwort auf Ticket #${ticket.number}`,
            body: ticket.subject,
            link: `/dashboard/tickets/${id}`,
            email: true,
          });
        } else if (ticket.authorId) {
          await notify({
            userId: ticket.authorId,
            type: "TICKET_REPLY",
            title: `Antwort auf Ticket #${ticket.number}`,
            body: ticket.subject,
            link: `/dashboard/tickets/${id}`,
            email: true,
          });
        }
      } else {
        await notifyStaff({
          type: "TICKET_REPLY",
          title: `Neue Antwort in Ticket #${ticket.number}`,
          body: ticket.subject,
          link: `/dashboard/tickets/${id}`,
        });
      }
    }

    return jsonOk(message, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
