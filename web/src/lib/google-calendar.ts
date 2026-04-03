export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
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
        allDay,
      };
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
