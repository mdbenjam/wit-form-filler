import { describe, it, expect } from "vitest";
import { checkSlotOverlap } from "./overlap";
import type { CalendarEvent } from "./google-calendar";
import type { DateRange } from "./parse-date-label";

function makeEvent(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, "startISO" | "endISO">): CalendarEvent {
  return {
    summary: "Event",
    start: "",
    end: "",
    allDay: false,
    ...overrides,
  };
}

function makeRange(startHour: number, endHour: number, date = "2026-06-14"): DateRange {
  const [y, m, d] = date.split("-").map(Number);
  return {
    start: new Date(y, m - 1, d, startHour, 0),
    end: new Date(y, m - 1, d, endHour, 0),
  };
}

describe("checkSlotOverlap", () => {
  it("returns 'unknown' when slotRange is null", () => {
    const events = [makeEvent({ startISO: "2026-06-14T14:00:00-04:00", endISO: "2026-06-14T15:00:00-04:00" })];
    expect(checkSlotOverlap(null, events)).toBe("unknown");
  });

  it("returns 'free' when no events", () => {
    const slot = makeRange(19, 22);
    expect(checkSlotOverlap(slot, [])).toBe("free");
  });

  it("returns 'free' when no overlap", () => {
    const slot = makeRange(19, 22); // 7pm-10pm
    const events = [
      makeEvent({ startISO: "2026-06-14T09:00:00", endISO: "2026-06-14T10:00:00" }), // 9am-10am
    ];
    expect(checkSlotOverlap(slot, events)).toBe("free");
  });

  it("detects partial overlap (event starts during slot)", () => {
    const slot = makeRange(14, 16); // 2pm-4pm
    const events = [
      makeEvent({ startISO: "2026-06-14T15:00:00", endISO: "2026-06-14T17:00:00" }), // 3pm-5pm
    ];
    expect(checkSlotOverlap(slot, events)).toBe("conflict");
  });

  it("detects partial overlap (event ends during slot)", () => {
    const slot = makeRange(14, 16); // 2pm-4pm
    const events = [
      makeEvent({ startISO: "2026-06-14T13:00:00", endISO: "2026-06-14T15:00:00" }), // 1pm-3pm
    ];
    expect(checkSlotOverlap(slot, events)).toBe("conflict");
  });

  it("detects full containment (event inside slot)", () => {
    const slot = makeRange(14, 18); // 2pm-6pm
    const events = [
      makeEvent({ startISO: "2026-06-14T15:00:00", endISO: "2026-06-14T16:00:00" }), // 3pm-4pm
    ];
    expect(checkSlotOverlap(slot, events)).toBe("conflict");
  });

  it("detects full containment (slot inside event)", () => {
    const slot = makeRange(15, 16); // 3pm-4pm
    const events = [
      makeEvent({ startISO: "2026-06-14T14:00:00", endISO: "2026-06-14T18:00:00" }), // 2pm-6pm
    ];
    expect(checkSlotOverlap(slot, events)).toBe("conflict");
  });

  it("adjacent events do not overlap (event ends when slot starts)", () => {
    const slot = makeRange(14, 16); // 2pm-4pm
    const events = [
      makeEvent({ startISO: "2026-06-14T12:00:00", endISO: "2026-06-14T14:00:00" }), // noon-2pm
    ];
    expect(checkSlotOverlap(slot, events)).toBe("free");
  });

  it("adjacent events do not overlap (slot ends when event starts)", () => {
    const slot = makeRange(14, 16); // 2pm-4pm
    const events = [
      makeEvent({ startISO: "2026-06-14T16:00:00", endISO: "2026-06-14T17:00:00" }), // 4pm-5pm
    ];
    expect(checkSlotOverlap(slot, events)).toBe("free");
  });

  it("all-day event conflicts with any timed slot on that date", () => {
    const slot = makeRange(19, 22); // 7pm-10pm
    const events = [
      makeEvent({ startISO: "2026-06-14", endISO: "2026-06-15", allDay: true }),
    ];
    expect(checkSlotOverlap(slot, events)).toBe("conflict");
  });

  it("all-day event on different date does not conflict", () => {
    const slot = makeRange(19, 22); // 7pm-10pm on June 14
    const events = [
      makeEvent({ startISO: "2026-06-15", endISO: "2026-06-16", allDay: true }),
    ];
    expect(checkSlotOverlap(slot, events)).toBe("free");
  });

  it("returns 'conflict' if any event overlaps among multiple", () => {
    const slot = makeRange(14, 16); // 2pm-4pm
    const events = [
      makeEvent({ startISO: "2026-06-14T09:00:00", endISO: "2026-06-14T10:00:00" }), // no overlap
      makeEvent({ startISO: "2026-06-14T15:00:00", endISO: "2026-06-14T17:00:00" }), // overlaps
    ];
    expect(checkSlotOverlap(slot, events)).toBe("conflict");
  });
});
