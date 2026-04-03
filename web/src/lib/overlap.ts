import type { DateRange } from "./parse-date-label";
import type { CalendarEvent } from "./google-calendar";

export type OverlapResult = "free" | "conflict" | "unknown";

/**
 * Checks whether a form time slot overlaps with any Google Calendar events.
 *
 * - Returns "unknown" if slotRange is null (can't determine overlap)
 * - Returns "conflict" if any event overlaps with the slot
 * - Returns "free" otherwise
 *
 * All-day events conflict with any timed slot on that date.
 * Standard interval overlap: slotStart < eventEnd && slotEnd > eventStart
 */
export function checkSlotOverlap(
  slotRange: DateRange | null,
  events: CalendarEvent[],
): OverlapResult {
  if (!slotRange) return "unknown";

  const slotStart = slotRange.start.getTime();
  const slotEnd = slotRange.end.getTime();

  for (const event of events) {
    if (event.allDay) {
      // All-day event: spans the entire date. Check if the slot falls on that date.
      // All-day events have startISO like "2026-06-14" and endISO like "2026-06-15" (exclusive).
      const eventStart = new Date(event.startISO + "T00:00:00").getTime();
      const eventEnd = new Date(event.endISO + "T00:00:00").getTime();
      if (slotStart < eventEnd && slotEnd > eventStart) {
        return "conflict";
      }
    } else {
      const eventStart = new Date(event.startISO).getTime();
      const eventEnd = new Date(event.endISO).getTime();
      if (slotStart < eventEnd && slotEnd > eventStart) {
        return "conflict";
      }
    }
  }

  return "free";
}
