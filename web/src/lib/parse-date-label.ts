const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// "Saturday, June 14, 7:00 PM" or "June 14" or "Jun 14, 2026"
const LONG_DATE = /(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\w*,?\s+)?(\w+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i;

// "6/14/2026" or "6/14" — anywhere in the string (not anchored)
const NUMERIC_DATE = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;

// "9:00PM" or "9:00 PM"
const TIME_12H = /(\d{1,2}):(\d{2})\s*(am|pm)/i;

/**
 * Parses a date slot label string into a Date object.
 *
 * Handles formats like:
 * - "Saturday, June 14, 7:00 PM - 10:00 PM" → Date(2026, 5, 14, 19, 0)
 * - "SAT 3/14 at 9:00PM" → Date(2026, 2, 14, 21, 0)
 * - "6/14/2026" → Date(2026, 5, 14)
 * - "6/14" → uses referenceYear or current year
 *
 * Returns null for time-only strings or unparseable labels.
 */
export function parseDateLabel(label: string, referenceYear?: number): Date | null {
  const year = referenceYear ?? new Date().getFullYear();

  // Try numeric date (possibly embedded): "6/14/2026", "6/14", "SAT 3/14 at 9:00PM"
  const numMatch = label.match(NUMERIC_DATE);
  if (numMatch) {
    const month = parseInt(numMatch[1], 10) - 1;
    const day = parseInt(numMatch[2], 10);
    const y = numMatch[3] ? normalizeYear(parseInt(numMatch[3], 10)) : year;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;

    const timeMatch = label.match(TIME_12H);
    if (timeMatch) {
      const { hours, minutes } = parseTime(timeMatch);
      return new Date(y, month, day, hours, minutes);
    }

    return new Date(y, month, day);
  }

  // Try long format: "Saturday, June 14, 7:00 PM - 10:00 PM"
  const longMatch = label.match(LONG_DATE);
  if (longMatch) {
    const monthName = longMatch[1].toLowerCase();
    const month = MONTHS[monthName];
    if (month === undefined) return null;

    const day = parseInt(longMatch[2], 10);
    const y = longMatch[3] ? parseInt(longMatch[3], 10) : year;
    if (day < 1 || day > 31) return null;

    const timeMatch = label.match(TIME_12H);
    if (timeMatch) {
      const { hours, minutes } = parseTime(timeMatch);
      return new Date(y, month, day, hours, minutes);
    }

    return new Date(y, month, day);
  }

  return null;
}

function parseTime(match: RegExpMatchArray): { hours: number; minutes: number } {
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toLowerCase();
  if (ampm === "pm" && hours !== 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}

function normalizeYear(y: number): number {
  if (y < 100) return 2000 + y;
  return y;
}
