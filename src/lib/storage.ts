import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Storage-Abstraktion. Aktuell ist ein lokaler Adapter implementiert;
 * S3/Cloudflare R2 lassen sich ergänzen, ohne aufrufenden Code zu ändern.
 */
export type StoredFile = {
  provider: string;
  key: string;
  url: string;
};

export interface StorageAdapter {
  readonly provider: string;
  save(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

/** Verhindert Path Traversal und erzeugt kollisionsfreie Dateinamen. */
export function buildStorageKey(originalName: string, prefix = "media"): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const safeExt = ext && ext.length <= 6 ? ext : ".bin";
  const stamp = new Date().toISOString().slice(0, 10);
  const unique = randomBytes(12).toString("hex");
  const safePrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || "media";
  return `${safePrefix}/${stamp}/${unique}${safeExt}`;
}

class LocalStorageAdapter implements StorageAdapter {
  readonly provider = "local";
  private readonly root: string;
  private readonly baseUrl: string;

  constructor() {
    this.root = path.resolve(process.env.UPLOAD_DIR ?? "./public/uploads");
    this.baseUrl = (process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads").replace(/\/$/, "");
  }

  private resolveSafe(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep) && target !== this.root) {
      throw new Error("Ungültiger Dateipfad.");
    }
    return target;
  }

  async save(key: string, data: Buffer): Promise<StoredFile> {
    const target = this.resolveSafe(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    return { provider: this.provider, key, url: this.publicUrl(key) };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveSafe(key));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (adapter) return adapter;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
      adapter = new LocalStorageAdapter();
      break;
    default:
      // Bewusst harter Fehler statt stiller Fallback auf lokalen Speicher.
      throw new Error(
        `Storage-Treiber "${driver}" ist nicht implementiert. Verfügbar: local.`,
      );
  }
  return adapter;
}
