import sharp from "sharp";
import type { MediaType } from "@prisma/client";

import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildStorageKey, getStorage } from "@/lib/storage";

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415 = 400,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/** Zielgrössen je Verwendungszweck – hält Seiten schnell und Speicher klein. */
const DIMENSIONS: Record<MediaType, { width: number; height?: number; fit: "cover" | "inside" }> = {
  LOGO: { width: 600, height: 600, fit: "inside" },
  HEADER: { width: 1920, height: 800, fit: "cover" },
  GALLERY: { width: 1600, fit: "inside" },
  SPONSOR: { width: 600, fit: "inside" },
  EVENT: { width: 1600, height: 900, fit: "cover" },
  HOMEPAGE: { width: 1920, fit: "inside" },
  DOCUMENT: { width: 1600, fit: "inside" },
};

const THUMBNAIL_WIDTH = 400;

/**
 * Prüft, verarbeitet und speichert ein hochgeladenes Bild.
 *
 * Sicherheitsmassnahmen:
 * - MIME-Typ und Dateigrösse werden vor der Verarbeitung geprüft.
 * - Der tatsächliche Bildinhalt wird durch sharp verifiziert; als Bild
 *   getarnte Dateien scheitern dabei.
 * - Die Datei wird neu kodiert (WebP), wodurch eingebettete Metadaten und
 *   potenziell schädliche Nutzlasten entfernt werden.
 * - Der Speicherschlüssel wird serverseitig erzeugt; der Originaldateiname
 *   fliesst nie in den Pfad ein (kein Path Traversal).
 */
export async function processAndStoreImage(options: {
  file: File;
  type: MediaType;
  organizationId?: string | null;
  uploadedById?: string | null;
  alt?: string | null;
  caption?: string | null;
}) {
  const { file, type } = options;

  if (!file || typeof file === "string") {
    throw new UploadError("Es wurde keine Datei übermittelt.");
  }

  if (file.size === 0) {
    throw new UploadError("Die Datei ist leer.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Die Datei ist zu gross. Maximal erlaubt sind ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
      413,
    );
  }

  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    throw new UploadError("Nur PNG-, JPG- und WebP-Dateien werden unterstützt.", 415);
  }

  const input = Buffer.from(await file.arrayBuffer());

  let pipeline: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    pipeline = sharp(input, { failOn: "error" });
    metadata = await pipeline.metadata();
  } catch {
    throw new UploadError("Die Datei konnte nicht als Bild gelesen werden.", 415);
  }

  if (!metadata.width || !metadata.height) {
    throw new UploadError("Die Bildabmessungen konnten nicht ermittelt werden.", 415);
  }

  // Schutz vor „Decompression Bomb“-Bildern.
  if (metadata.width * metadata.height > 50_000_000) {
    throw new UploadError("Die Bildauflösung ist zu hoch.", 413);
  }

  const target = DIMENSIONS[type];

  const main = await sharp(input)
    .rotate() // Ausrichtung gemäss EXIF anwenden, danach Metadaten verwerfen
    .resize({
      width: target.width,
      height: target.height,
      fit: target.fit,
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumbnail = await sharp(input)
    .rotate()
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();

  const storage = getStorage();
  const prefix = options.organizationId ? `org/${options.organizationId}` : "shared";

  const mainKey = buildStorageKey("image.webp", prefix);
  const thumbKey = buildStorageKey("thumb.webp", `${prefix}/thumbs`);

  const [stored, storedThumb] = await Promise.all([
    storage.save(mainKey, main.data, "image/webp"),
    storage.save(thumbKey, thumbnail, "image/webp"),
  ]);

  return prisma.media.create({
    data: {
      type,
      provider: stored.provider,
      key: stored.key,
      url: stored.url,
      thumbnailUrl: storedThumb.url,
      filename: sanitizeFilename(file.name),
      mimeType: "image/webp",
      size: main.data.byteLength,
      width: main.info.width,
      height: main.info.height,
      alt: options.alt ?? null,
      caption: options.caption ?? null,
      organizationId: options.organizationId ?? null,
      uploadedById: options.uploadedById ?? null,
    },
  });
}

/** Entfernt Pfadanteile und Sonderzeichen aus dem angezeigten Dateinamen. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "datei";
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "datei";
}

/** Löscht Datenbankeintrag und zugehörige Dateien im Speicher. */
export async function deleteMedia(mediaId: string): Promise<void> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { id: true, key: true, thumbnailUrl: true, provider: true },
  });
  if (!media) return;

  const storage = getStorage();

  // Datenbankeintrag zuerst entfernen: verwaiste Dateien sind harmloser
  // als Datensätze, die auf gelöschte Dateien verweisen.
  await prisma.media.delete({ where: { id: media.id } });

  try {
    await storage.delete(media.key);
    if (media.thumbnailUrl) {
      const thumbKey = media.thumbnailUrl.replace(
        `${process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads"}/`,
        "",
      );
      await storage.delete(thumbKey);
    }
  } catch (error) {
    console.error("[media] Datei konnte nicht gelöscht werden:", error);
  }
}
