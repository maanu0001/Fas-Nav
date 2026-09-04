"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, Plus, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState, Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { CANTONS, PLACEMENT_TYPE_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { formatDateShort } from "@/lib/dates";
import { formatChf } from "@/lib/utils";
import type { PlacementStatus, PlacementType } from "@prisma/client";

type Placement = {
  id: string;
  type: PlacementType;
  status: PlacementStatus;
  startDate: string;
  endDate: string;
  priceChf: number | null;
  cantonSlug: string | null;
  organization: { id: string; name: string } | null;
  event: { id: string; title: string } | null;
};

const STATUS_LABELS: Record<PlacementStatus, string> = {
  REQUESTED: "Angefragt",
  ACTIVE: "Aktiv",
  EXPIRED: "Abgelaufen",
  CANCELLED: "Storniert",
};

const STATUS_VARIANT = {
  REQUESTED: "warning",
  ACTIVE: "success",
  EXPIRED: "muted",
  CANCELLED: "muted",
} as const;

export function PlacementManager({
  placements,
  organizations,
  events,
}: {
  placements: Placement[];
  organizations: { id: string; name: string }[];
  events: { id: string; title: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [type, setType] = React.useState<PlacementType>("FEATURED_CARNIVAL");

  // Welches Ziel gewählt werden muss, hängt vom Platzierungstyp ab.
  const needsEvent = type === "FEATURED_EVENT" || type === "AGENDA_HIGHLIGHT";
  const needsCanton = type === "CANTON_HIGHLIGHT";

  async function createPlacement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/placements", {
        method: "POST",
        body: {
          type,
          organizationId: needsEvent || needsCanton ? null : data.get("organizationId") || null,
          eventId: needsEvent ? data.get("eventId") || null : null,
          cantonSlug: needsCanton ? data.get("cantonSlug") || null : null,
          status: data.get("status"),
          startDate: data.get("startDate"),
          endDate: data.get("endDate"),
          priceChf: data.get("priceChf") || null,
          notes: data.get("notes") || null,
        },
      });
      toast("Platzierung erstellt.", "success");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setErrors(fieldErrors(error));
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function updateStatus(id: string, status: PlacementStatus) {
    try {
      await apiRequest(`/api/placements/${id}`, { method: "PATCH", body: { status } });
      toast("Platzierung aktualisiert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function remove(id: string) {
    try {
      await apiRequest(`/api/placements/${id}`, { method: "DELETE" });
      toast("Platzierung entfernt.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  return (
    <>
      <div className="mb-5">
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Platzierung buchen
        </Button>
      </div>

      {placements.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Art</Th>
                <Th>Ziel</Th>
                <Th>Zeitraum</Th>
                <Th>Preis</Th>
                <Th>Status</Th>
                <Th>Aktion</Th>
              </Tr>
            </Thead>
            <tbody>
              {placements.map((placement) => (
                <Tr key={placement.id}>
                  <Td className="whitespace-nowrap font-medium">
                    {PLACEMENT_TYPE_LABELS[placement.type]}
                  </Td>
                  <Td>
                    {placement.organization ? (
                      <Link
                        href={`/dashboard/organisationen/${placement.organization.id}`}
                        className="text-sm text-primary-800 hover:underline"
                      >
                        {placement.organization.name}
                      </Link>
                    ) : placement.event ? (
                      <Link
                        href={`/dashboard/veranstaltungen/${placement.event.id}`}
                        className="text-sm text-primary-800 hover:underline"
                      >
                        {placement.event.title}
                      </Link>
                    ) : placement.cantonSlug ? (
                      <span className="text-sm text-muted-foreground">
                        Kanton {placement.cantonSlug}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateShort(placement.startDate)} – {formatDateShort(placement.endDate)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {placement.priceChf !== null ? formatChf(placement.priceChf) : "–"}
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[placement.status]}>
                      {STATUS_LABELS[placement.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={placement.status}
                        onChange={(e) =>
                          updateStatus(placement.id, e.target.value as PlacementStatus)
                        }
                        className="h-8 text-xs"
                        aria-label="Status ändern"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(placement.id)}
                        aria-label="Platzierung entfernen"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <Card className="p-0">
          <EmptyState
            icon={Megaphone}
            title="Keine Platzierungen gebucht"
            description="Hebe Fasnachten, Guggen oder Veranstaltungen an prominenter Stelle hervor."
          />
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Platzierung buchen"
        description="Aktive Platzierungen heben den Eintrag sofort hervor."
        className="sm:max-w-xl"
      >
        <form onSubmit={createPlacement} className="space-y-4" noValidate>
          <Field label="Art der Platzierung" htmlFor="type" required>
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as PlacementType)}
            >
              {Object.entries(PLACEMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {needsEvent ? (
            <Field label="Veranstaltung" htmlFor="eventId" required error={errors.eventId}>
              <Select id="eventId" name="eventId" required>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </Field>
          ) : needsCanton ? (
            <Field label="Kanton" htmlFor="cantonSlug" required error={errors.cantonSlug}>
              <Select id="cantonSlug" name="cantonSlug" required>
                {CANTONS.map((canton) => (
                  <option key={canton.slug} value={canton.slug}>
                    {canton.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field
              label="Organisation"
              htmlFor="organizationId"
              required
              error={errors.organizationId}
            >
              <Select id="organizationId" name="organizationId" required>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Von" htmlFor="startDate" required error={errors.startDate}>
              <Input id="startDate" name="startDate" type="date" required />
            </Field>
            <Field label="Bis" htmlFor="endDate" required error={errors.endDate}>
              <Input id="endDate" name="endDate" type="date" required />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preis (CHF)" htmlFor="priceChf" error={errors.priceChf}>
              <Input id="priceChf" name="priceChf" type="number" step="0.05" min="0" />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue="ACTIVE">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Notiz" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} maxLength={600} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : <Save />}
              Platzierung erstellen
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
