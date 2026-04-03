import { describe, it, expect } from "vitest";
import {
  buildCalendarMonth,
  groupSlotsByDate,
  getSlotMonths,
  formatDateKey,
} from "./calendar-utils";

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatDateKey(new Date(2026, 5, 14))).toBe("2026-06-14");
  });

  it("pads single-digit month and day", () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("buildCalendarMonth", () => {
  // June 2026 starts on a Monday
  const weeks = buildCalendarMonth(2026, 5, new Date(2026, 5, 14));

  it("returns an array of week arrays", () => {
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("starts the first row on Sunday", () => {
    // June 1, 2026 is a Monday, so the first cell should be May 31 (Sunday)
    expect(weeks[0][0].date.getDay()).toBe(0); // Sunday
  });

  it("marks non-current-month days correctly", () => {
    // First cell is May 31
    expect(weeks[0][0].isCurrentMonth).toBe(false);
    // Second cell is June 1
    expect(weeks[0][1].isCurrentMonth).toBe(true);
  });

  it("marks today correctly", () => {
    const todayCells = weeks.flat().filter((d) => d.isToday);
    expect(todayCells).toHaveLength(1);
    expect(formatDateKey(todayCells[0].date)).toBe("2026-06-14");
  });

  it("covers all days in the month", () => {
    const juneDays = weeks
      .flat()
      .filter((d) => d.isCurrentMonth)
      .map((d) => d.date.getDate());
    expect(juneDays).toHaveLength(30);
    expect(juneDays[0]).toBe(1);
    expect(juneDays[juneDays.length - 1]).toBe(30);
  });
});

describe("groupSlotsByDate", () => {
  it("groups slots by date key", () => {
    const slots = [
      { id: "1", date: "2026-06-14T19:00:00.000Z", label: "Slot A" },
      { id: "2", date: "2026-06-14T22:00:00.000Z", label: "Slot B" },
      { id: "3", date: "2026-06-15T14:00:00.000Z", label: "Slot C" },
    ];
    const grouped = groupSlotsByDate(slots);
    expect(grouped.size).toBe(2);
    expect(grouped.get("2026-06-14")).toHaveLength(2);
    expect(grouped.get("2026-06-15")).toHaveLength(1);
  });

  it("excludes slots without dates", () => {
    const slots = [
      { id: "1", date: null, label: "No date" },
      { id: "2", date: "2026-06-14T00:00:00.000Z", label: "Has date" },
    ];
    const grouped = groupSlotsByDate(slots);
    expect(grouped.size).toBe(1);
  });

  it("returns empty map for no slots", () => {
    expect(groupSlotsByDate([]).size).toBe(0);
  });
});

describe("getSlotMonths", () => {
  it("returns unique sorted months", () => {
    const slots = [
      { date: "2026-07-01T00:00:00.000Z" },
      { date: "2026-06-14T00:00:00.000Z" },
      { date: "2026-06-21T00:00:00.000Z" },
      { date: "2026-07-05T00:00:00.000Z" },
    ];
    const months = getSlotMonths(slots);
    expect(months).toEqual([
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
    ]);
  });

  it("skips slots without dates", () => {
    const slots = [{ date: null }, { date: "2026-06-14T00:00:00.000Z" }];
    const months = getSlotMonths(slots);
    expect(months).toEqual([{ year: 2026, month: 5 }]);
  });

  it("returns empty for no slots", () => {
    expect(getSlotMonths([])).toEqual([]);
  });
});
