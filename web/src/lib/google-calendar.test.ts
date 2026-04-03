import { describe, it, expect } from "vitest";
import { parseGoogleEvents, formatEventTime, sortCalendarEvents } from "./google-calendar";

describe("parseGoogleEvents", () => {
  it("parses timed events", () => {
    const raw = [
      {
        summary: "Team Meeting",
        start: { dateTime: "2026-06-14T14:00:00-04:00" },
        end: { dateTime: "2026-06-14T15:00:00-04:00" },
      },
    ];
    const events = parseGoogleEvents(raw);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Team Meeting");
    expect(events[0].allDay).toBe(false);
    expect(events[0].start).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
    expect(events[0].startISO).toBe("2026-06-14T14:00:00-04:00");
    expect(events[0].endISO).toBe("2026-06-14T15:00:00-04:00");
  });

  it("parses all-day events", () => {
    const raw = [
      {
        summary: "Vacation",
        start: { date: "2026-06-14" },
        end: { date: "2026-06-15" },
      },
    ];
    const events = parseGoogleEvents(raw);
    expect(events).toHaveLength(1);
    expect(events[0].allDay).toBe(true);
    expect(events[0].start).toBe("2026-06-14");
    expect(events[0].end).toBe("2026-06-15");
    expect(events[0].startISO).toBe("2026-06-14");
    expect(events[0].endISO).toBe("2026-06-15");
  });

  it("filters out cancelled events", () => {
    const raw = [
      {
        summary: "Cancelled Meeting",
        start: { dateTime: "2026-06-14T14:00:00-04:00" },
        end: { dateTime: "2026-06-14T15:00:00-04:00" },
        status: "cancelled",
      },
      {
        summary: "Active Meeting",
        start: { dateTime: "2026-06-14T16:00:00-04:00" },
        end: { dateTime: "2026-06-14T17:00:00-04:00" },
        status: "confirmed",
      },
    ];
    const events = parseGoogleEvents(raw);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Active Meeting");
  });

  it("handles events with no summary", () => {
    const raw = [
      {
        start: { dateTime: "2026-06-14T14:00:00-04:00" },
        end: { dateTime: "2026-06-14T15:00:00-04:00" },
      },
    ];
    const events = parseGoogleEvents(raw);
    expect(events[0].summary).toBe("(No title)");
  });

  it("handles empty array", () => {
    expect(parseGoogleEvents([])).toEqual([]);
  });
});

describe("formatEventTime", () => {
  it("formats ISO datetime to readable time", () => {
    const result = formatEventTime("2026-06-14T14:00:00-04:00");
    // Should be something like "2:00 PM" (depends on locale)
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
  });

  it("returns empty string for empty input", () => {
    expect(formatEventTime("")).toBe("");
  });
});

describe("sortCalendarEvents", () => {
  it("sorts events by start time ascending", () => {
    const events = [
      { summary: "Late", start: "3:00 PM", end: "4:00 PM", startISO: "2026-06-14T15:00:00-04:00", endISO: "2026-06-14T16:00:00-04:00", allDay: false },
      { summary: "Early", start: "9:00 AM", end: "10:00 AM", startISO: "2026-06-14T09:00:00-04:00", endISO: "2026-06-14T10:00:00-04:00", allDay: false },
      { summary: "Mid", start: "12:00 PM", end: "1:00 PM", startISO: "2026-06-14T12:00:00-04:00", endISO: "2026-06-14T13:00:00-04:00", allDay: false },
    ];
    const sorted = sortCalendarEvents(events);
    expect(sorted.map((e) => e.summary)).toEqual(["Early", "Mid", "Late"]);
  });

  it("does not mutate the original array", () => {
    const events = [
      { summary: "B", start: "2:00 PM", end: "3:00 PM", startISO: "2026-06-14T14:00:00-04:00", endISO: "2026-06-14T15:00:00-04:00", allDay: false },
      { summary: "A", start: "9:00 AM", end: "10:00 AM", startISO: "2026-06-14T09:00:00-04:00", endISO: "2026-06-14T10:00:00-04:00", allDay: false },
    ];
    sortCalendarEvents(events);
    expect(events[0].summary).toBe("B");
  });

  it("all-day events sort before timed events on the same day", () => {
    const events = [
      { summary: "Timed", start: "9:00 AM", end: "10:00 AM", startISO: "2026-06-14T09:00:00-04:00", endISO: "2026-06-14T10:00:00-04:00", allDay: false },
      { summary: "All Day", start: "2026-06-14", end: "2026-06-15", startISO: "2026-06-14", endISO: "2026-06-15", allDay: true },
    ];
    const sorted = sortCalendarEvents(events);
    expect(sorted[0].summary).toBe("All Day");
  });

  it("returns empty array for empty input", () => {
    expect(sortCalendarEvents([])).toEqual([]);
  });
});
