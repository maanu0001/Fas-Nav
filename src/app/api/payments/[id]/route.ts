import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { paymentUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("managePayments");
    const body = await parseBody(request, paymentUpdateSchema);

    const before = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subscriptionId: true,
        periodEnd: true,
      },
    });
    if (!before) return jsonError("Rechnung nicht gefunden.", 404);

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...body,
        // Beim Wechsel auf „bezahlt“ wird das Zahldatum automatisch gesetzt.
        ...(body.status === "PAID" && !body.paidAt && before.status !== "PAID"
          ? { paidAt: new Date() }
          : {}),
      },
      select: { id: true, invoiceNumber: true, status: true, paidAt: true, amountChf: true },
    });

    if (payment.status === "PAID" && before.status !== "PAID" && before.subscriptionId) {
      const periodEnd = body.periodEnd ?? before.periodEnd;
      await prisma.subscription.update({
        where: { id: before.subscriptionId },
        data: {
          status: "ACTIVE",
          lastPaymentAt: payment.paidAt ?? new Date(),
          ...(periodEnd
            ? { endDate: periodEnd, expiringNotifiedAt: null, expiredNotifiedAt: null }
            : {}),
        },
      });
    }

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "payment.update",
      entity: "Payment",
      entityId: id,
      entityLabel: payment.invoiceNumber,
      before: { status: before.status },
      after: { status: payment.status },
    });

    return jsonOk(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
