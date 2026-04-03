import { describe, it, expect } from "vitest";
import { parseGoogleEvents, formatEventTime } from "./google-calendar";

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
