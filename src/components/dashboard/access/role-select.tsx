"use client";

import { Select } from "@/components/ui/input";
import { MEMBERSHIP_ROLE_DESCRIPTIONS, MEMBERSHIP_ROLE_LABELS } from "@/lib/constants";
import type { MembershipRole } from "@prisma/client";

const ROLES: MembershipRole[] = ["OWNER", "MANAGER", "EDITOR"];

/** Auswahl der Berechtigung innerhalb einer Organisation. */
export function RoleSelect({
  value,
  onChange,
  id,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: MembershipRole;
  onChange: (role: MembershipRole) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel ?? "Berechtigung"}
      className={className}
      onChange={(e) => onChange(e.target.value as MembershipRole)}
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {MEMBERSHIP_ROLE_LABELS[role]}
        </option>
      ))}
    </Select>
  );
}

/** Erklärt die Bedeutung der gewählten Berechtigung. */
export function RoleHint({ role }: { role: MembershipRole }) {
  return (
    <p className="mt-1 text-xs text-muted-foreground">{MEMBERSHIP_ROLE_DESCRIPTIONS[role]}</p>
  );
}

export { ROLES as MEMBERSHIP_ROLES };
