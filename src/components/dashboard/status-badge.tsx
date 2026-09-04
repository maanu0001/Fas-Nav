import type {
  PaymentStatus,
  PublicationStatus,
  SubscriptionStatus,
  TicketPriority,
  TicketStatus,
  VerificationStatus,
} from "@prisma/client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  PAYMENT_STATUS_LABELS,
  PUBLICATION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/constants";

type Variant = BadgeProps["variant"];

const PUBLICATION: Record<PublicationStatus, Variant> = {
  DRAFT: "muted",
  PENDING_REVIEW: "info",
  PUBLISHED: "success",
  UNPUBLISHED: "warning",
  SUSPENDED: "destructive",
};

const SUBSCRIPTION: Record<SubscriptionStatus, Variant> = {
  TRIAL: "info",
  ACTIVE: "success",
  PAYMENT_PENDING: "warning",
  EXPIRED: "destructive",
  CANCELLED: "muted",
  SUSPENDED: "destructive",
};

const PAYMENT: Record<PaymentStatus, Variant> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "destructive",
  REFUNDED: "info",
  CANCELLED: "muted",
};

const TICKET: Record<TicketStatus, Variant> = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  WAITING_FOR_CUSTOMER: "secondary",
  RESOLVED: "success",
  CLOSED: "muted",
};

const PRIORITY: Record<TicketPriority, Variant> = {
  LOW: "muted",
  NORMAL: "secondary",
  HIGH: "warning",
  URGENT: "destructive",
};

const VERIFICATION: Record<VerificationStatus, Variant> = {
  UNVERIFIED: "muted",
  VERIFIED: "info",
  OFFICIAL: "default",
};

export function PublicationBadge({ status }: { status: PublicationStatus }) {
  return <Badge variant={PUBLICATION[status]}>{PUBLICATION_STATUS_LABELS[status]}</Badge>;
}

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={SUBSCRIPTION[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function TicketBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={TICKET[status]}>{TICKET_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={PRIORITY[priority]}>{TICKET_PRIORITY_LABELS[priority]}</Badge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={VERIFICATION[status]}>{VERIFICATION_LABELS[status]}</Badge>;
}
