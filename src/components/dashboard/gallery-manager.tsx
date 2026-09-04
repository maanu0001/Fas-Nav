"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";

export type GalleryItem = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  caption: string | null;
};

/** Verwaltung der Bildergalerie einer Organisation. */
export function GalleryManager({
  organizationId,
  initial,
  limit,
  enabled,
}: {
  organizationId: string;
  initial: GalleryItem[];
  limit: number | null;
  enabled: boolean;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [items, setItems] = React.useState(initial);
  const [uploading, setUploading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const limitReached = limit !== null && items.length >= limit;

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    // Nacheinander hochladen – so bleibt die Fehlermeldung eindeutig zuordenbar.
    for (const file of files) {
      if (limit !== null && items.length >= limit) {
        toast(`Limit von ${limit} Bildern erreicht.`, "error");
        break;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "GALLERY");
      formData.append("organizationId", organizationId);

      try {
        const media = await apiRequest<GalleryItem>("/api/media", {
          method: "POST",
          formData,
        });
        setItems((prev) => [...prev, media]);
      } catch (error) {
        toast(`${file.name}: ${errorMessage(error)}`, "error");
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveCaption(item: GalleryItem, caption: string) {
    try {
      await apiRequest(`/api/media/${item.id}`, { method: "PATCH", body: { caption } });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, caption } : i)));
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function removeItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/media/${deleteTarget.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast("Bild gelöscht.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!enabled) {
    return (
      <Alert variant="info" title="Galerie ist in deinem Tarif nicht enthalten">
        Mit dem Premium-Abo kannst du eine Bildergalerie auf deiner Seite anzeigen.{" "}
        <a href="/dashboard/abonnement" className="font-medium underline">
          Abonnement ansehen
        </a>
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button onClick={() => inputRef.current?.click()} disabled={uploading || limitReached}>
          {uploading ? <Spinner /> : <ImagePlus />}
          {uploading ? "Wird hochgeladen …" : "Bilder hinzufügen"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {limit !== null ? `${items.length} von ${limit} Bildern` : `${items.length} Bilder`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={onFiles}
          className="sr-only"
          aria-label="Bilder auswählen"
        />
      </div>

      {limitReached ? (
        <Alert variant="warning" className="mb-5">
          Du hast das Bildlimit deines Tarifs erreicht. Lösche Bilder oder wechsle den Tarif.
        </Alert>
      ) : null}

      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <figure key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={item.thumbnailUrl ?? item.url}
                  alt={item.alt ?? "Galeriebild"}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="space-y-2 p-3">
                <Input
                  defaultValue={item.caption ?? ""}
                  placeholder="Bildunterschrift (optional)"
                  maxLength={300}
                  aria-label="Bildunterschrift"
                  onBlur={(e) => {
                    if (e.target.value !== (item.caption ?? "")) {
                      void saveCaption(item, e.target.value);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  block
                  onClick={() => setDeleteTarget(item)}
                  className="text-destructive hover:bg-red-50"
                >
                  <Trash2 />
                  Entfernen
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ImagePlus}
          title="Noch keine Bilder"
          description="Lade Impressionen deiner Fasnacht oder Gugge hoch – sie erscheinen in der Galerie deiner öffentlichen Seite."
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeItem}
        pending={deleting}
        title="Bild löschen?"
        description="Das Bild wird von deiner Seite entfernt und dauerhaft gelöscht."
      />
    </>
  );
}
