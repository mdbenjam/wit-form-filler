import { describe, it, expect } from "vitest";
import { parseDateLabel } from "./parse-date-label";

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
});
