import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { notifyOrganization } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { paymentSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Erzeugt eine fortlaufende Rechnungsnummer im Format RE-JJJJ-NNNN. */
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RE-${year}-`;

  const last = await prisma.payment.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  const lastNumber = last ? Number(last.invoiceNumber.slice(prefix.length)) : 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

/** Rechnung erfassen – manuelle Verwaltung bis zur Anbindung eines Providers. */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("managePayments");
    const body = await parseBody(request, paymentSchema);

    const organization = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true, name: true },
    });
    if (!organization) return jsonError("Organisation nicht gefunden.", 404);

    const payment = await prisma.payment.create({
      data: {
        ...body,
        invoiceNumber: await nextInvoiceNumber(),
      },
      select: {
        id: true,
        invoiceNumber: true,
        amountChf: true,
        status: true,
        dueAt: true,
        paidAt: true,
      },
    });

    // Eine bezahlte Rechnung aktualisiert direkt das Abonnement.
    if (body.status === "PAID" && body.subscriptionId) {
      await prisma.subscription.update({
        where: { id: body.subscriptionId },
        data: {
          lastPaymentAt: body.paidAt ?? new Date(),
          status: "ACTIVE",
          ...(body.periodEnd ? { endDate: body.periodEnd, expiredNotifiedAt: null, expiringNotifiedAt: null } : {}),
        },
      });
    }

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "payment.create",
      entity: "Payment",
      entityId: payment.id,
      entityLabel: payment.invoiceNumber,
      after: { amountChf: body.amountChf, status: body.status, organization: organization.name },
    });

    await notifyOrganization(body.organizationId, {
      type: body.status === "PAID" ? "PAYMENT_RECEIVED" : "PAYMENT_DUE",
      title:
        body.status === "PAID"
          ? `Zahlung verbucht – ${payment.invoiceNumber}`
          : `Neue Rechnung ${payment.invoiceNumber}`,
      body: `Betrag: CHF ${Number(payment.amountChf).toFixed(2)}`,
      link: "/dashboard/abonnement",
    });

    return jsonOk(payment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
