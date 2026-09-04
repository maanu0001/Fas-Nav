import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { EventCardData } from "@/components/public/event-card";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function addMonths(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monatskalender als Server-Komponente – dadurch bleibt die Ansicht
 * ohne JavaScript nutzbar und suchmaschinenfreundlich.
 */
export function EventCalendar({
  month,
  events,
  buildMonthHref,
}: {
  month: Date;
  events: EventCardData[];
  buildMonthHref: (month: string) => string;
}) {
  const monthStart = startOfMonth(month);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  // Veranstaltungen laufen ggf. über mehrere Tage und erscheinen an jedem davon.
  const byDay = new Map<string, EventCardData[]>();
  for (const event of events) {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : start;
    for (const day of days) {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      if (start <= dayEnd && end >= day) {
        const key = day.toDateString();
        byDay.set(key, [...(byDay.get(key) ?? []), event]);
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <Link
          href={buildMonthHref(monthKey(addMonths(month, -1)))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
        <h2 className="font-display text-lg font-semibold capitalize">
          {formatDate(month, "MMMM yyyy")}
        </h2>
        <Link
          href={buildMonthHref(monthKey(addMonths(month, 1)))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = byDay.get(day.toDateString()) ?? [];
          const outside = !isSameMonth(day, monthStart);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5 last:border-r-0 sm:min-h-28",
                outside && "bg-muted/30",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day)
                      ? "bg-accent-500 font-bold text-white"
                      : outside
                        ? "text-muted-foreground/60"
                        : "text-slate-700",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <Link
                    key={`${event.id}-${day.toISOString()}`}
                    href={`/event/${event.slug}`}
                    title={`${event.title} – ${EVENT_TYPE_LABELS[event.type]}, ${event.city}`}
                    className="block truncate rounded bg-primary-50 px-1.5 py-1 text-[0.68rem] font-medium leading-tight text-primary-800 transition-colors hover:bg-primary-100"
                  >
                    {!event.allDay && isSameDay(new Date(event.startDate), day) ? (
                      <span className="mr-1 font-semibold text-accent-600">
                        {formatTime(event.startDate)}
                      </span>
                    ) : null}
                    {event.title}
                  </Link>
                ))}
                {dayEvents.length > 3 ? (
                  <p className="px-1.5 text-[0.65rem] font-medium text-muted-foreground">
                    +{dayEvents.length - 3} weitere
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function parseMonth(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export { monthKey };
