"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { MediaType } from "@prisma/client";

export type UploadedMedia = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Bild-Upload mit sofortiger Vorschau.
 * Bewusst einfach gehalten: auswählen, hochladen, fertig.
 */
export function ImageUpload({
  label,
  hint,
  type,
  organizationId,
  value,
  onChange,
  aspect = "aspect-video",
  className,
}: {
  label: string;
  hint?: string;
  type: MediaType;
  organizationId: string;
  value: UploadedMedia | null;
  onChange: (media: UploadedMedia | null) => void;
  aspect?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPending(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("organizationId", organizationId);

    try {
      const media = await apiRequest<UploadedMedia>("/api/media", {
        method: "POST",
        formData,
      });
      onChange(media);
      toast("Bild hochgeladen.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
      // Erlaubt das erneute Auswählen derselben Datei.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40",
          aspect,
        )}
      >
        {value?.url ? (
          <>
            <Image
              src={value.url}
              alt={value.alt ?? label}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className={cn("object-cover", type === "LOGO" && "object-contain p-3")}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-primary-950/80 to-transparent p-2.5">
              <Button
                variant="inverseOutline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={pending}
              >
                {pending ? <Spinner /> : <Upload />}
                Ersetzen
              </Button>
              <Button
                variant="inverseOutline"
                size="sm"
                onClick={() => onChange(null)}
                disabled={pending}
                aria-label="Bild entfernen"
              >
                <Trash2 />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center transition-colors hover:bg-muted"
          >
            {pending ? (
              <Spinner className="h-6 w-6" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
            )}
            <span className="text-sm font-medium text-slate-700">
              {pending ? "Wird hochgeladen …" : "Bild auswählen"}
            </span>
            <span className="text-xs text-muted-foreground">PNG, JPG oder WebP</span>
          </button>
        )}
      </div>

      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFile}
        className="sr-only"
        aria-label={label}
      />
    </div>
  );
}
