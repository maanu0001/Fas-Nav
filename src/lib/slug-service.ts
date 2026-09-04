import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * Erzeugt einen eindeutigen Slug. Bei Kollisionen wird ein Zähler angehängt,
 * damit öffentliche URLs stets eindeutig und lesbar bleiben.
 */
export async function uniqueOrganizationSlug(
  name: string,
  options: { excludeId?: string; preferred?: string } = {},
): Promise<string> {
  const base = slugify(options.preferred || name) || "organisation";
  return findFree(base, async (candidate) => {
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return !existing || existing.id === options.excludeId;
  });
}

export async function uniqueEventSlug(
  title: string,
  options: { excludeId?: string; preferred?: string; city?: string; year?: number } = {},
): Promise<string> {
  // Ort und Jahr im Slug erhöhen die Eindeutigkeit und helfen der Auffindbarkeit.
  // Bereits im Titel enthaltene Angaben werden nicht wiederholt.
  const parts = [options.preferred || title];
  if (!options.preferred) {
    const titleSlug = slugify(title);
    if (options.city && !titleSlug.includes(slugify(options.city))) {
      parts.push(options.city);
    }
    if (options.year && !titleSlug.includes(String(options.year))) {
      parts.push(String(options.year));
    }
  }
  const base = slugify(parts.join(" ")) || "veranstaltung";

  return findFree(base, async (candidate) => {
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return !existing || existing.id === options.excludeId;
  });
}

async function findFree(base: string, isFree: (candidate: string) => Promise<boolean>) {
  if (await isFree(base)) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`;
    if (await isFree(candidate)) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
