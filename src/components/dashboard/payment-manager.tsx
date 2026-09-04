"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState, Spinner } from "@/components/ui/states";
import { PaymentBadge } from "@/components/dashboard/status-badge";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { formatDateShort } from "@/lib/dates";
import { formatChf } from "@/lib/utils";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export type PaymentRow = {
  id: string;
  invoiceNumber: string;
  amountChf: number;
  status: PaymentStatus;
  method: PaymentMethod;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  organization: { id: string; name: string };
};

export function PaymentManager({
  payments,
  organizations,
}: {
  payments: PaymentRow[];
  organizations: { id: string; name: string; subscriptionId: string | null; priceChf: number }[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [organizationId, setOrganizationId] = React.useState(organizations[0]?.id ?? "");

  const selectedOrg = organizations.find((o) => o.id === organizationId);

  async function createPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/payments", {
        method: "POST",
        body: {
          organizationId,
          subscriptionId: selectedOrg?.subscriptionId ?? null,
          amountChf: data.get("amountChf"),
          status: data.get("status"),
          method: data.get("method"),
          dueAt: data.get("dueAt") || null,
          paidAt: data.get("paidAt") || null,
          periodStart: data.get("periodStart") || null,
          periodEnd: data.get("periodEnd") || null,
          reference: data.get("reference") || null,
          notes: data.get("notes") || null,
        },
      });
      toast("Rechnung erstellt.", "success");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setErrors(fieldErrors(error));
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function updateStatus(id: string, status: PaymentStatus) {
    try {
      await apiRequest(`/api/payments/${id}`, { method: "PATCH", body: { status } });
      toast("Zahlungsstatus aktualisiert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  return (
    <>
      <div className="mb-5">
        <Button onClick={() => setOpen(true)} disabled={!organizations.length}>
          <Plus />
          Rechnung erfassen
        </Button>
      </div>

      {payments.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Rechnung</Th>
                <Th>Organisation</Th>
                <Th>Betrag</Th>
                <Th>Ausgestellt</Th>
                <Th>Fällig</Th>
                <Th>Zahlungsart</Th>
                <Th>Status</Th>
                <Th>Aktion</Th>
              </Tr>
            </Thead>
            <tbody>
              {payments.map((payment) => (
                <Tr key={payment.id}>
                  <Td className="whitespace-nowrap font-mono text-xs">{payment.invoiceNumber}</Td>
                  <Td>
                    <Link
                      href={`/dashboard/organisationen/${payment.organization.id}`}
                      className="text-sm text-primary-800 hover:underline"
                    >
                      {payment.organization.name}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap font-medium">
                    {formatChf(payment.amountChf)}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateShort(payment.issuedAt)}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {payment.dueAt ? formatDateShort(payment.dueAt) : "–"}
                  </Td>
                  <Td className="text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </Td>
                  <Td>
                    <PaymentBadge status={payment.status} />
                  </Td>
                  <Td>
                    <Select
                      value={payment.status}
                      onChange={(e) => updateStatus(payment.id, e.target.value as PaymentStatus)}
                      className="h-8 text-xs"
                      aria-label={`Status von ${payment.invoiceNumber} ändern`}
                    >
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <Card className="p-0">
          <EmptyState
            title="Noch keine Rechnungen"
            description="Erfasse Rechnungen manuell, bis eine Zahlungsschnittstelle angebunden ist."
          />
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rechnung erfassen"
        description="Die Rechnungsnummer wird automatisch vergeben."
        className="sm:max-w-xl"
      >
        <form onSubmit={createPayment} className="space-y-4" noValidate>
          <Field label="Organisation" htmlFor="organizationId" required>
            <Select
              id="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Betrag (CHF)" htmlFor="amountChf" required error={errors.amountChf}>
              <Input
                id="amountChf"
                name="amountChf"
                type="number"
                step="0.05"
                min="0"
                defaultValue={selectedOrg?.priceChf ?? 0}
                required
              />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue="PENDING">
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Zahlungsart" htmlFor="method">
            <Select id="method" name="method" defaultValue="INVOICE">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fällig am" htmlFor="dueAt" error={errors.dueAt}>
              <Input id="dueAt" name="dueAt" type="date" />
            </Field>
            <Field label="Bezahlt am" htmlFor="paidAt" error={errors.paidAt}>
              <Input id="paidAt" name="paidAt" type="date" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Periode von" htmlFor="periodStart">
              <Input id="periodStart" name="periodStart" type="date" />
            </Field>
            <Field
              label="Periode bis"
              htmlFor="periodEnd"
              hint="Bei Status „Bezahlt“ wird das Abo bis zu diesem Datum verlängert."
            >
              <Input id="periodEnd" name="periodEnd" type="date" />
            </Field>
          </div>

          <Field label="Referenz" htmlFor="reference" error={errors.reference}>
            <Input id="reference" name="reference" maxLength={80} />
          </Field>

          <Field label="Notiz" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} maxLength={1000} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : <Save />}
              Rechnung erstellen
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
