import Link from "next/link";
import { CalendarDays, MapPin, Music2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LogoImage, MediaImage, type MediaLike } from "@/components/public/media-image";
import { ClaimBadge, VerifiedBadge } from "@/components/public/verified-badge";
import { formatDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ClaimStatus, OrganizationType, VerificationStatus } from "@prisma/client";

export type OrganizationCardData = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  shortDescription: string | null;
  tagline: string | null;
  city: string;
  canton: { code: string; name: string; slug: string };
  startDate: Date | null;
  endDate: Date | null;
  foundedYear: number | null;
  verification: VerificationStatus;
  claimStatus: ClaimStatus;
  isFeatured: boolean;
  logo: MediaLike;
  header: MediaLike;
};

export function organizationHref(org: { type: OrganizationType; slug: string }): string {
  return org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`;
}

export function OrganizationCard({
  organization: org,
  className,
}: {
  organization: OrganizationCardData;
  className?: string;
}) {
  const href = organizationHref(org);
  const isCarnival = org.type === "CARNIVAL";
  const description = org.shortDescription || org.tagline;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-subtle transition-all hover:-translate-y-0.5 hover:shadow-card",
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <MediaImage
          media={org.header}
          alt={`${org.name} – Titelbild`}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {org.isFeatured ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-semibold text-white shadow-subtle">
            <Sparkles className="h-3 w-3" aria-hidden />
            Empfohlen
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/*
          Logo und Name bilden eine gemeinsame Zeile: das Logo links, vertikal
          zur Namenszeile zentriert. Die feste Kachelgrösse und "shrink-0"
          halten die Zeile unabhängig von den Massen des hochgeladenen Logos
          stabil, sodass kein Layoutsprung entsteht.
        */}
        <div className="flex items-center gap-3">
          <LogoImage media={org.logo} name={org.name} size={48} className="shadow-subtle" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold text-primary-900">
              <Link href={href} className="after:absolute after:inset-0 after:content-['']">
                {org.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {org.city} · {org.canton.code}
            </p>
          </div>
        </div>

        {description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-xs">
          {isCarnival && org.startDate ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary-700">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatDateRange(org.startDate, org.endDate)}
            </span>
          ) : null}
          {!isCarnival && org.foundedYear ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary-700">
              <Music2 className="h-3.5 w-3.5" aria-hidden />
              seit {org.foundedYear}
            </span>
          ) : null}
          <VerifiedBadge status={org.verification} />
          <ClaimBadge status={org.claimStatus} />
        </div>
      </div>
    </article>
  );
}

/** Kompakte Variante für Sidebars und verwandte Inhalte. */
export function OrganizationRow({ organization: org }: { organization: OrganizationCardData }) {
  return (
    <Link
      href={organizationHref(org)}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary"
    >
      <LogoImage media={org.logo} name={org.name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary-900">{org.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {org.city} · {org.canton.code}
        </p>
      </div>
      <Badge variant="muted">{org.type === "CARNIVAL" ? "Fasnacht" : "Gugge"}</Badge>
    </Link>
  );
}
