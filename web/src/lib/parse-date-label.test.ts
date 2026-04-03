import { describe, it, expect } from "vitest";
import { parseDateLabel, parseDateRange } from "./parse-date-label";

describe("parseDateLabel", () => {
  it("parses long format with day name, month, day, and time range", () => {
    const result = parseDateLabel("Saturday, June 14, 7:00 PM - 10:00 PM");
    expect(result).toEqual(new Date(2026, 5, 14, 19, 0));
  });

  it("parses long format with time in AM", () => {
    const result = parseDateLabel("Sunday, June 15, 10:00 AM - 1:00 PM");
    expect(result).toEqual(new Date(2026, 5, 15, 10, 0));
  });

  it("parses 12:00 PM as noon", () => {
    const result = parseDateLabel("Monday, June 16, 12:00 PM - 3:00 PM");
    expect(result).toEqual(new Date(2026, 5, 16, 12, 0));
  });

  it("parses 12:00 AM as midnight", () => {
    const result = parseDateLabel("Monday, June 16, 12:00 AM - 2:00 AM");
    expect(result).toEqual(new Date(2026, 5, 16, 0, 0));
  });

  it("parses long format without time", () => {
    const result = parseDateLabel("Saturday, June 14");
    expect(result).toEqual(new Date(2026, 5, 14));
  });

  it("parses long format with explicit year", () => {
    const result = parseDateLabel("June 14, 2027");
    expect(result).toEqual(new Date(2027, 5, 14));
  });

  it("parses numeric date with year: 6/14/2026", () => {
    const result = parseDateLabel("6/14/2026");
    expect(result).toEqual(new Date(2026, 5, 14));
  });

  it("parses numeric date with 2-digit year: 6/14/26", () => {
    const result = parseDateLabel("6/14/26");
    expect(result).toEqual(new Date(2026, 5, 14));
  });

  it("parses numeric date without year, uses referenceYear", () => {
    const result = parseDateLabel("6/14", 2027);
    expect(result).toEqual(new Date(2027, 5, 14));
  });

  it("parses numeric date without year, defaults to current year", () => {
    const result = parseDateLabel("6/14");
    const currentYear = new Date().getFullYear();
    expect(result).toEqual(new Date(currentYear, 5, 14));
  });

  it("returns null for time-only strings", () => {
    expect(parseDateLabel("7:00 PM - 10:00 PM")).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(parseDateLabel("Weekend 1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDateLabel("")).toBeNull();
  });

  it("parses month name without day name prefix", () => {
    const result = parseDateLabel("June 14");
    expect(result).toEqual(new Date(2026, 5, 14));
  });

  it("parses abbreviated month names", () => {
    const result = parseDateLabel("Jun 14");
    expect(result).toEqual(new Date(2026, 5, 14));
  });

  it("parses 'SAT 3/14 at 9:00PM' format", () => {
    const result = parseDateLabel("SAT 3/14 at 9:00PM");
    expect(result).toEqual(new Date(2026, 2, 14, 21, 0));
  });

  it("parses 'FRI 3/13 at 7:30PM' format", () => {
    const result = parseDateLabel("FRI 3/13 at 7:30PM");
    expect(result).toEqual(new Date(2026, 2, 13, 19, 30));
  });

  it("parses 'SUN 3/15 at 1:00PM' format", () => {
    const result = parseDateLabel("SUN 3/15 at 1:00PM");
    expect(result).toEqual(new Date(2026, 2, 15, 13, 0));
  });

  it("creates dates in the specified timezone", () => {
    // 9:30 PM EDT (UTC-4) = 1:30 AM UTC next day
    // Without timezone, .toISOString() date part would be wrong (next day)
    const result = parseDateLabel("FRI 3/20 at 9:30PM", undefined, "America/New_York");
    expect(result).not.toBeNull();
    // March 20 9:30 PM EDT = March 21 01:30 UTC
    expect(result!.toISOString()).toBe("2026-03-21T01:30:00.000Z");
    // The date part in UTC is the 21st, but the wall clock date in ET is the 20th
    // This is correct — the Date represents the right instant in time
  });

  it("preserves correct date for date-only labels with timezone", () => {
    // Midnight March 20 EDT = 4:00 AM UTC March 20
    const result = parseDateLabel("3/20", undefined, "America/New_York");
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe("2026-03-20T04:00:00.000Z");
    // .slice(0, 10) on this ISO string gives "2026-03-20" — correct!
  });
});

describe("parseDateRange", () => {
  it("parses long format with start and end time", () => {
    const result = parseDateRange("Saturday, June 14, 7:00 PM - 10:00 PM");
    expect(result).toEqual({
      start: new Date(2026, 5, 14, 19, 0),
      end: new Date(2026, 5, 14, 22, 0),
    });
  });

  it("parses AM time range", () => {
    const result = parseDateRange("Sunday, June 15, 10:00 AM - 1:00 PM");
    expect(result).toEqual({
      start: new Date(2026, 5, 15, 10, 0),
      end: new Date(2026, 5, 15, 13, 0),
    });
  });

  it("defaults to 1-hour duration for single time", () => {
    const result = parseDateRange("SAT 3/14 at 9:00PM");
    expect(result).toEqual({
      start: new Date(2026, 2, 14, 21, 0),
      end: new Date(2026, 2, 14, 22, 0),
    });
  });

  it("returns null for date-only labels", () => {
    expect(parseDateRange("6/14/2026")).toBeNull();
  });

  it("returns null for labels with no date", () => {
    expect(parseDateRange("7:00 PM - 10:00 PM")).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(parseDateRange("Weekend 1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDateRange("")).toBeNull();
  });

  it("uses referenceYear when no year in label", () => {
    const result = parseDateRange("SAT 3/14 at 9:00PM", 2027);
    expect(result).toEqual({
      start: new Date(2027, 2, 14, 21, 0),
      end: new Date(2027, 2, 14, 22, 0),
    });
  });

  it("creates dates in the specified timezone", () => {
    // 7:00 PM EDT (UTC-4) = 11:00 PM UTC
    const result = parseDateRange("Saturday, June 14, 7:00 PM - 10:00 PM", undefined, "America/New_York");
    expect(result).not.toBeNull();
    expect(result!.start.toISOString()).toBe("2026-06-14T23:00:00.000Z");
    expect(result!.end.toISOString()).toBe("2026-06-15T02:00:00.000Z");
  });

  it("handles EST (winter) vs EDT (summer) correctly", () => {
    // January = EST (UTC-5): 7:00 PM EST = midnight UTC
    const result = parseDateRange("FRI 1/16 at 7:00PM", 2026, "America/New_York");
    expect(result).not.toBeNull();
    expect(result!.start.toISOString()).toBe("2026-01-17T00:00:00.000Z");
  });
});
