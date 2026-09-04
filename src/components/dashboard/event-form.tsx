"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ImageUpload, type UploadedMedia } from "@/components/dashboard/image-upload";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import type { EventType, PublicationStatus } from "@prisma/client";

export type EventFormValues = {
  title: string;
  type: EventType;
  shortDescription: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  venueName: string;
  street: string;
  zip: string;
  city: string;
  cantonId: string;
  organizerName: string;
  externalUrl: string;
  ticketUrl: string;
  price: string;
  priceInfo: string;
  status: PublicationStatus;
  image: UploadedMedia | null;
};

export function EventForm({
  organizationId,
  eventId,
  cantons,
  initial,
  canDelete = true,
}: {
  organizationId: string;
  eventId?: string;
  cantons: { id: string; name: string }[];
  initial: EventFormValues;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const payload = {
      title: values.title,
      type: values.type,
      shortDescription: values.shortDescription || null,
      description: values.description || null,
      startDate: values.startDate,
      endDate: values.endDate || null,
      allDay: values.allDay,
      venueName: values.venueName || null,
      street: values.street || null,
      zip: values.zip || null,
      city: values.city,
      cantonId: values.cantonId,
      organizerName: values.organizerName || null,
      externalUrl: values.externalUrl || null,
      ticketUrl: values.ticketUrl || null,
      price: values.price === "" ? null : values.price,
      priceInfo: values.priceInfo || null,
      status: values.status,
      imageId: values.image?.id ?? null,
    };

    try {
      if (eventId) {
        await apiRequest(`/api/events/${eventId}`, { method: "PATCH", body: payload });
        toast("Veranstaltung gespeichert.", "success");
        router.refresh();
      } else {
        const created = await apiRequest<{ id: string }>("/api/events", {
          method: "POST",
          body: { ...payload, organizationId },
        });
        toast("Veranstaltung erstellt.", "success");
        router.push(`/dashboard/veranstaltungen/${created.id}`);
      }
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!eventId) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/events/${eventId}`, { method: "DELETE" });
      toast("Veranstaltung gelöscht.", "success");
      router.push("/dashboard/veranstaltungen");
    } catch (error) {
      toast(errorMessage(error), "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-3" noValidate>
      <div className="space-y-5 lg:col-span-2">
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Angaben zur Veranstaltung</h2>
          <div className="space-y-4">
            <Field label="Titel" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={160}
                required
                placeholder="z.B. Grosser Fasnachtsumzug 2027"
              />
            </Field>

            <Field label="Art der Veranstaltung" htmlFor="type" required error={errors.type}>
              <Select
                id="type"
                value={values.type}
                onChange={(e) => set("type", e.target.value as EventType)}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Kurzbeschreibung"
              htmlFor="shortDescription"
              error={errors.shortDescription}
              hint="Erscheint in der Agenda-Liste."
            >
              <Textarea
                id="shortDescription"
                value={values.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                rows={3}
                maxLength={400}
              />
            </Field>

            <Field label="Beschreibung" htmlFor="description" error={errors.description}>
              <Textarea
                id="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                rows={7}
                maxLength={6000}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Datum und Zeit</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <Checkbox
                checked={values.allDay}
                onChange={(e) => set("allDay", e.target.checked)}
              />
              Ganztägige Veranstaltung
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Beginn" htmlFor="startDate" required error={errors.startDate}>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={values.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Ende"
                htmlFor="endDate"
                error={errors.endDate}
                hint="Optional. Bei mehrtägigen Anlässen bitte ausfüllen."
              >
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={values.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Veranstaltungsort</h2>
          <div className="space-y-4">
            <Field label="Lokal / Örtlichkeit" htmlFor="venueName" error={errors.venueName}>
              <Input
                id="venueName"
                value={values.venueName}
                onChange={(e) => set("venueName", e.target.value)}
                maxLength={160}
                placeholder="z.B. Stadthalle Olten"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Strasse" htmlFor="street" error={errors.street} className="sm:col-span-2">
                <Input
                  id="street"
                  value={values.street}
                  onChange={(e) => set("street", e.target.value)}
                  maxLength={160}
                />
              </Field>
              <Field label="PLZ" htmlFor="zip" error={errors.zip}>
                <Input
                  id="zip"
                  value={values.zip}
                  onChange={(e) => set("zip", e.target.value)}
                  maxLength={10}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ort" htmlFor="city" required error={errors.city}>
                <Input
                  id="city"
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                  maxLength={120}
                  required
                />
              </Field>
              <Field label="Kanton" htmlFor="cantonId" required error={errors.cantonId}>
                <Select
                  id="cantonId"
                  value={values.cantonId}
                  onChange={(e) => set("cantonId", e.target.value)}
                >
                  {cantons.map((canton) => (
                    <option key={canton.id} value={canton.id}>
                      {canton.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Eintritt und Links</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Eintrittspreis (CHF)"
                htmlFor="price"
                error={errors.price}
                hint="0 eingeben für „Eintritt frei“. Leer lassen, wenn unbekannt."
              >
                <Input
                  id="price"
                  type="number"
                  step="0.05"
                  min="0"
                  value={values.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </Field>
              <Field label="Hinweis zum Eintritt" htmlFor="priceInfo" error={errors.priceInfo}>
                <Input
                  id="priceInfo"
                  value={values.priceInfo}
                  onChange={(e) => set("priceInfo", e.target.value)}
                  maxLength={160}
                  placeholder="z.B. Kinder gratis"
                />
              </Field>
            </div>

            <Field label="Ticketlink" htmlFor="ticketUrl" error={errors.ticketUrl}>
              <Input
                id="ticketUrl"
                type="url"
                value={values.ticketUrl}
                onChange={(e) => set("ticketUrl", e.target.value)}
                placeholder="https://tickets.example.ch/..."
                maxLength={500}
              />
            </Field>

            <Field label="Externe Website" htmlFor="externalUrl" error={errors.externalUrl}>
              <Input
                id="externalUrl"
                type="url"
                value={values.externalUrl}
                onChange={(e) => set("externalUrl", e.target.value)}
                placeholder="https://www.example.ch/..."
                maxLength={500}
              />
            </Field>

            <Field
              label="Veranstalter"
              htmlFor="organizerName"
              error={errors.organizerName}
              hint="Nur ausfüllen, wenn abweichend von deiner Organisation."
            >
              <Input
                id="organizerName"
                value={values.organizerName}
                onChange={(e) => set("organizerName", e.target.value)}
                maxLength={160}
              />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Veröffentlichung</h2>
          <Field label="Status" htmlFor="status" error={errors.status}>
            <Select
              id="status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as PublicationStatus)}
            >
              <option value="DRAFT">Entwurf – nicht sichtbar</option>
              <option value="PUBLISHED">Veröffentlicht – in der Agenda</option>
              <option value="UNPUBLISHED">Nicht veröffentlicht</option>
            </Select>
          </Field>

          <div className="mt-5 space-y-2">
            <Button type="submit" block size="lg" disabled={pending}>
              {pending ? <Spinner /> : <Save />}
              {pending ? "Wird gespeichert …" : eventId ? "Speichern" : "Veranstaltung erstellen"}
            </Button>

            {eventId && canDelete ? (
              <Button
                type="button"
                variant="destructive"
                block
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 />
                Löschen
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <ImageUpload
            label="Veranstaltungsbild"
            hint="Erscheint in der Agenda und beim Teilen."
            type="EVENT"
            organizationId={organizationId}
            value={values.image}
            onChange={(media) => set("image", media)}
          />
        </Card>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        pending={deleting}
        title="Veranstaltung löschen?"
        description="Die Veranstaltung wird aus der Agenda entfernt und kann nicht wiederhergestellt werden."
      />
    </form>
  );
}
