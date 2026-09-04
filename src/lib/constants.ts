import type {
  EventType,
  MediaType,
  OrganizationType,
  PaymentMethod,
  PaymentStatus,
  PublicationStatus,
  Role,
  SocialPlatform,
  SubscriptionStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  VerificationStatus,
  ClaimStatus,
  MembershipRole,
  PlacementType,
} from "@prisma/client";

export const SITE = {
  name: "Fas-Nav.ch",
  shortName: "Fas-Nav",
  logo: "FN",
  domain: "fas-nav.ch",
  tagline: "Die Schweizer Fasnacht auf einen Blick.",
  description:
    "Fas-Nav.ch ist die zentrale Übersicht für Fasnachten, Guggenmusiken, Umzüge und Fasnachtsveranstaltungen in der ganzen Schweiz.",
} as const;

/** Die 26 Schweizer Kantone inkl. Regionszuordnung für Landingpages und Filter. */
export const CANTONS = [
  { code: "AG", name: "Aargau", slug: "aargau", region: "Nordwestschweiz" },
  { code: "AI", name: "Appenzell Innerrhoden", slug: "appenzell-innerrhoden", region: "Ostschweiz" },
  { code: "AR", name: "Appenzell Ausserrhoden", slug: "appenzell-ausserrhoden", region: "Ostschweiz" },
  { code: "BE", name: "Bern", slug: "bern", region: "Espace Mittelland" },
  { code: "BL", name: "Basel-Landschaft", slug: "basel-landschaft", region: "Nordwestschweiz" },
  { code: "BS", name: "Basel-Stadt", slug: "basel-stadt", region: "Nordwestschweiz" },
  { code: "FR", name: "Freiburg", slug: "freiburg", region: "Espace Mittelland" },
  { code: "GE", name: "Genf", slug: "genf", region: "Genferseeregion" },
  { code: "GL", name: "Glarus", slug: "glarus", region: "Ostschweiz" },
  { code: "GR", name: "Graubünden", slug: "graubuenden", region: "Ostschweiz" },
  { code: "JU", name: "Jura", slug: "jura", region: "Espace Mittelland" },
  { code: "LU", name: "Luzern", slug: "luzern", region: "Zentralschweiz" },
  { code: "NE", name: "Neuenburg", slug: "neuenburg", region: "Espace Mittelland" },
  { code: "NW", name: "Nidwalden", slug: "nidwalden", region: "Zentralschweiz" },
  { code: "OW", name: "Obwalden", slug: "obwalden", region: "Zentralschweiz" },
  { code: "SG", name: "St. Gallen", slug: "st-gallen", region: "Ostschweiz" },
  { code: "SH", name: "Schaffhausen", slug: "schaffhausen", region: "Ostschweiz" },
  { code: "SO", name: "Solothurn", slug: "solothurn", region: "Nordwestschweiz" },
  { code: "SZ", name: "Schwyz", slug: "schwyz", region: "Zentralschweiz" },
  { code: "TG", name: "Thurgau", slug: "thurgau", region: "Ostschweiz" },
  { code: "TI", name: "Tessin", slug: "tessin", region: "Tessin" },
  { code: "UR", name: "Uri", slug: "uri", region: "Zentralschweiz" },
  { code: "VD", name: "Waadt", slug: "waadt", region: "Genferseeregion" },
  { code: "VS", name: "Wallis", slug: "wallis", region: "Genferseeregion" },
  { code: "ZG", name: "Zug", slug: "zug", region: "Zentralschweiz" },
  { code: "ZH", name: "Zürich", slug: "zuerich", region: "Zürich" },
] as const;

export const REGIONS = Array.from(new Set(CANTONS.map((c) => c.region))).sort();

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FASNACHT: "Fasnacht",
  UMZUG: "Umzug",
  GUGGENKONZERT: "Guggenkonzert",
  MONSTERKONZERT: "Monsterkonzert",
  MASKENBALL: "Maskenball",
  BEIZENFASNACHT: "Beizenfasnacht",
  KINDERFASNACHT: "Kinderfasnacht",
  SCHNITZELBANK: "Schnitzelbank",
  WAGENBAU: "Wagenbau",
  VORFASNACHT: "Vorfasnacht",
  HAUPTFASNACHT: "Hauptfasnacht",
  ABSCHLUSSVERANSTALTUNG: "Abschlussveranstaltung",
  SONSTIGE: "Sonstige Veranstaltung",
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  CARNIVAL: "Fasnacht",
  GUGGE: "Gugge",
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "In Prüfung",
  PUBLISHED: "Veröffentlicht",
  UNPUBLISHED: "Nicht veröffentlicht",
  SUSPENDED: "Gesperrt",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Nicht verifiziert",
  VERIFIED: "Verifiziert",
  OFFICIAL: "Offiziell",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  UNCLAIMED: "Nicht beansprucht",
  CLAIM_REQUESTED: "Übernahme angefragt",
  CLAIMED: "Beansprucht",
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  TEAM: "Team",
  FASNACHT: "Fasnacht",
  GUGGE: "Gugge",
  VISITOR: "Besucher",
};

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Inhaber",
  EDITOR: "Bearbeiter",
  VIEWER: "Leser",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Testphase",
  ACTIVE: "Aktiv",
  PAYMENT_PENDING: "Zahlung ausstehend",
  EXPIRED: "Abgelaufen",
  CANCELLED: "Gekündigt",
  SUSPENDED: "Gesperrt",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Offen",
  PAID: "Bezahlt",
  FAILED: "Fehlgeschlagen",
  REFUNDED: "Rückerstattet",
  CANCELLED: "Storniert",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  INVOICE: "Rechnung",
  BANK_TRANSFER: "Banküberweisung",
  TWINT: "TWINT",
  CREDIT_CARD: "Kreditkarte",
  STRIPE: "Stripe",
  OTHER: "Andere",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  WAITING_FOR_CUSTOMER: "Wartet auf Rückmeldung",
  RESOLVED: "Gelöst",
  CLOSED: "Geschlossen",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Tief",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  TECHNICAL: "Technisches Problem",
  PAGE_EDIT: "Seite bearbeiten",
  SUBSCRIPTION: "Abonnement",
  INVOICE: "Rechnung",
  EVENT: "Veranstaltung",
  GENERAL: "Allgemeine Frage",
  CONTACT: "Kontaktanfrage",
  OTHER: "Sonstiges",
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  X: "X",
  LINKEDIN: "LinkedIn",
  SPOTIFY: "Spotify",
  WHATSAPP: "WhatsApp",
  OTHER: "Anderes Netzwerk",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  LOGO: "Logo",
  HEADER: "Titelbild",
  GALLERY: "Galerie",
  SPONSOR: "Sponsor",
  EVENT: "Veranstaltung",
  HOMEPAGE: "Homepage",
  DOCUMENT: "Dokument",
};

export const PLACEMENT_TYPE_LABELS: Record<PlacementType, string> = {
  FEATURED_CARNIVAL: "Featured Fasnacht",
  FEATURED_GUGGE: "Featured Gugge",
  FEATURED_EVENT: "Featured Veranstaltung",
  HOMEPAGE_SLOT: "Homepage-Platzierung",
  CANTON_HIGHLIGHT: "Kanton-Highlight",
  AGENDA_HIGHLIGHT: "Agenda-Highlight",
};

/** Feature-Keys des Abo-Systems. Limits und Zuordnung kommen aus der Datenbank. */
export const FEATURE_KEYS = {
  DIRECTORY_LISTING: "directory_listing",
  PUBLIC_PAGE: "public_page",
  SOCIAL_LINKS: "social_links",
  EVENTS: "events",
  GALLERY: "gallery",
  SPONSORS: "sponsors",
  STATISTICS: "statistics",
  HIGHLIGHTED: "highlighted",
  PROGRAM: "program",
  DOWNLOADS: "downloads",
  FAQ: "faq",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export const ALLOWED_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"] as const;

export const MAX_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? "8") * 1024 * 1024;

/** Wie lange vor Ablauf eine Abo-Warnung ausgelöst wird. */
export const SUBSCRIPTION_EXPIRY_WARNING_DAYS = 30;
