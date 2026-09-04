import type { HomepageSectionType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SectionButton = { label: string; href: string; variant?: "primary" | "secondary" | "ghost" };
export type SectionItem = { title: string; body: string; icon?: string | null };

export type SectionData = {
  buttons?: SectionButton[];
  items?: SectionItem[];
  organizationIds?: string[];
  eventIds?: string[];
  limit?: number;
};

export type HomepageSection = {
  id: string;
  key: string;
  type: HomepageSectionType;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  isVisible: boolean;
  sortOrder: number;
  image: { url: string; alt: string | null; width: number | null; height: number | null } | null;
  data: SectionData;
};

const SECTION_SELECT = {
  id: true,
  key: true,
  type: true,
  eyebrow: true,
  title: true,
  subtitle: true,
  body: true,
  isVisible: true,
  sortOrder: true,
  data: true,
  image: { select: { url: true, alt: true, width: true, height: true } },
} satisfies Prisma.HomepageSectionSelect;

function normalise(row: Prisma.HomepageSectionGetPayload<{ select: typeof SECTION_SELECT }>): HomepageSection {
  return {
    ...row,
    data: (row.data ?? {}) as SectionData,
  };
}

/** Alle sichtbaren Sektionen in redaktioneller Reihenfolge. */
export async function getHomepageSections(includeHidden = false): Promise<HomepageSection[]> {
  const rows = await prisma.homepageSection.findMany({
    where: includeHidden ? {} : { isVisible: true },
    select: SECTION_SELECT,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(normalise);
}

export async function getHomepageSection(key: string): Promise<HomepageSection | null> {
  const row = await prisma.homepageSection.findUnique({ where: { key }, select: SECTION_SELECT });
  return row ? normalise(row) : null;
}

/** Plattform-Einstellungen als Key-Value-Map. */
export async function getSiteSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.siteSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function settingString(
  settings: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}
