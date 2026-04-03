export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  startISO: string;
  endISO: string;
  allDay: boolean;
}

interface GoogleEventTime {
  dateTime?: string;
  date?: string;
}

interface GoogleEvent {
  summary?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  status?: string;
}

/**
 * Parses raw Google Calendar API event objects into our CalendarEvent format.
 * Filters out cancelled events.
 */
export function parseGoogleEvents(rawEvents: GoogleEvent[]): CalendarEvent[] {
  return rawEvents
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const allDay = !e.start?.dateTime;
      return {
        summary: e.summary || "(No title)",
        start: allDay ? (e.start?.date ?? "") : formatEventTime(e.start?.dateTime ?? ""),
        end: allDay ? (e.end?.date ?? "") : formatEventTime(e.end?.dateTime ?? ""),
        startISO: allDay ? (e.start?.date ?? "") : (e.start?.dateTime ?? ""),
        endISO: allDay ? (e.end?.date ?? "") : (e.end?.dateTime ?? ""),
        allDay,
      };
    });
}

/**
 * Sorts calendar events by start time (ascending).
 * All-day events (date-only ISO strings) sort before timed events on the same day.
 */
export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.startISO).getTime();
    const bTime = new Date(b.startISO).getTime();
    return aTime - bTime;
  });
}

/**
 * Formats an ISO datetime string to a human-readable time like "7:00 PM".
 */
export function formatEventTime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
