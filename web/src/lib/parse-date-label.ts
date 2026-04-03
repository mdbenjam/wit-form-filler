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

// Matches two times separated by a dash: "7:00 PM - 10:00 PM"
const TIME_RANGE = /(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i;

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
export function parseDateLabel(label: string, referenceYear?: number, timeZone?: string): Date | null {
  const year = referenceYear ?? new Date().getFullYear();
  const makeDate = timeZone
    ? (y: number, m: number, d: number, h: number, min: number) => createDateInTZ(y, m, d, h, min, timeZone)
    : (y: number, m: number, d: number, h: number, min: number) => new Date(y, m, d, h, min);

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
      return makeDate(y, month, day, hours, minutes);
    }

    return makeDate(y, month, day, 0, 0);
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
      return makeDate(y, month, day, hours, minutes);
    }

    return makeDate(y, month, day, 0, 0);
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

export interface DateRange {
  start: Date;
  end: Date;
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Parses a slot label into a start/end DateRange.
 *
 * - "Saturday, June 14, 7:00 PM - 10:00 PM" → 7pm–10pm on June 14
 * - "SAT 3/14 at 9:00PM" → 9pm–10pm on March 14 (default 1-hour duration)
 * - "6/14" → null (no time component)
 *
 * Returns null if no time can be parsed.
 */
export function parseDateRange(label: string, referenceYear?: number, timeZone?: string): DateRange | null {
  const year = referenceYear ?? new Date().getFullYear();
  const makeDate = timeZone
    ? (y: number, m: number, d: number, h: number, min: number) => createDateInTZ(y, m, d, h, min, timeZone)
    : (y: number, m: number, d: number, h: number, min: number) => new Date(y, m, d, h, min);

  // Parse the date portion first
  let dateMonth: number | null = null;
  let dateDay: number | null = null;
  let dateYear = year;

  const numMatch = label.match(NUMERIC_DATE);
  if (numMatch) {
    dateMonth = parseInt(numMatch[1], 10) - 1;
    dateDay = parseInt(numMatch[2], 10);
    dateYear = numMatch[3] ? normalizeYear(parseInt(numMatch[3], 10)) : year;
  } else {
    const longMatch = label.match(LONG_DATE);
    if (longMatch) {
      const monthName = longMatch[1].toLowerCase();
      const month = MONTHS[monthName];
      if (month === undefined) return null;
      dateMonth = month;
      dateDay = parseInt(longMatch[2], 10);
      dateYear = longMatch[3] ? parseInt(longMatch[3], 10) : year;
    }
  }

  if (dateMonth === null || dateDay === null) return null;

  // Try to parse a time range: "7:00 PM - 10:00 PM"
  const rangeMatch = label.match(TIME_RANGE);
  if (rangeMatch) {
    const startTime = parseTime([, rangeMatch[1], rangeMatch[2], rangeMatch[3]] as unknown as RegExpMatchArray);
    const endTime = parseTime([, rangeMatch[4], rangeMatch[5], rangeMatch[6]] as unknown as RegExpMatchArray);
    return {
      start: makeDate(dateYear, dateMonth, dateDay, startTime.hours, startTime.minutes),
      end: makeDate(dateYear, dateMonth, dateDay, endTime.hours, endTime.minutes),
    };
  }

  // Try single time — default 1-hour duration
  const timeMatch = label.match(TIME_12H);
  if (timeMatch) {
    const { hours, minutes } = parseTime(timeMatch);
    const start = makeDate(dateYear, dateMonth, dateDay, hours, minutes);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
    return { start, end };
  }

  // Has date but no time
  return null;
}

/**
 * Creates a Date representing the given wall-clock time in the specified IANA
 * timezone. E.g. createDateInTZ(2026, 3, 3, 19, 30, "America/New_York") returns
 * a Date whose UTC value equals 7:30 PM EDT on April 3, 2026.
 */
function createDateInTZ(
  year: number, month: number, day: number,
  hours: number, minutes: number, timeZone: string,
): Date {
  // Probe at noon UTC on the target date to determine the timezone offset.
  // Avoids midnight edge case where hour12:false produces "24:00:00".
  const noon = Date.UTC(year, month, day, 12, 0);
  const probeDate = new Date(noon);
  const utcStr = probeDate.toLocaleString("en-US", { timeZone: "UTC", hour12: false });
  const tzStr = probeDate.toLocaleString("en-US", { timeZone, hour12: false });
  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
  // Apply that offset to the actual desired wall-clock time
  const utcGuess = Date.UTC(year, month, day, hours, minutes);
  return new Date(utcGuess - offsetMs);
}
