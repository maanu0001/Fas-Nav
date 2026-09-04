import { format, formatDistanceToNow, isSameDay, isSameMonth } from "date-fns";
import { de } from "date-fns/locale";

const opts = { locale: de } as const;

export function formatDate(date: Date | string | null | undefined, pattern = "d. MMMM yyyy"): string {
  if (!date) return "–";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "–";
  return format(d, pattern, opts);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  return formatDate(date, "dd.MM.yyyy");
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm", opts);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "–";
  return `${formatDate(date)}, ${formatTime(date)} Uhr`;
}

export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "–";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "–";
  return formatDistanceToNow(d, { addSuffix: true, ...opts });
}

/** Lesbarer Zeitraum, z.B. „12.–15. Februar 2027“. */
export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  if (!start) return "–";
  const s = typeof start === "string" ? new Date(start) : start;
  if (!end) return formatDate(s);
  const e = typeof end === "string" ? new Date(end) : end;
  if (isSameDay(s, e)) return formatDate(s);
  if (isSameMonth(s, e)) return `${format(s, "d.", opts)}–${format(e, "d. MMMM yyyy", opts)}`;
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, "d. MMMM", opts)} – ${format(e, "d. MMMM yyyy", opts)}`;
  }
  return `${formatDate(s)} – ${formatDate(e)}`;
}

/** Zeitangabe eines Agenda-Eintrags. */
export function formatEventTime(
  start: Date | string,
  end: Date | string | null | undefined,
  allDay: boolean,
): string {
  if (allDay) return "Ganztägig";
  const startTime = formatTime(start);
  if (!end) return `${startTime} Uhr`;
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  if (isSameDay(s, e)) return `${startTime} – ${formatTime(e)} Uhr`;
  return `${startTime} Uhr – ${formatDateShort(e)}, ${formatTime(e)} Uhr`;
}

/** Beginn des heutigen Tages – Basis für „kommende Veranstaltungen“. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

export function toDateTimeInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd'T'HH:mm");
}
