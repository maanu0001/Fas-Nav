import type { SocialPlatform } from "@prisma/client";

import type { UploadedMedia } from "@/components/dashboard/image-upload";

export type SocialLinkDraft = {
  platform: SocialPlatform;
  url: string;
  label: string;
};

/** Bearbeitungszustand des Live-Editors. */
export type EditorState = {
  name: string;
  shortName: string;
  tagline: string;
  shortDescription: string;
  description: string;
  history: string;
  importantInfo: string;
  city: string;
  street: string;
  zip: string;
  cantonId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  bookingEmail: string;
  startDate: string;
  endDate: string;
  foundedYear: string;
  memberCount: string;
  repertoire: string;
  musicStyle: string;
  metaTitle: string;
  metaDesc: string;
  logo: UploadedMedia | null;
  header: UploadedMedia | null;
  socialLinks: SocialLinkDraft[];
};
