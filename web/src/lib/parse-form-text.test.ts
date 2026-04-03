import { describe, it, expect } from "vitest";
import { parseFormText } from "./parse-form-text";

describe("parseFormText", () => {
  it("extracts date lines with day names", () => {
    const text = `Saturday, June 14, 7:00 PM - 10:00 PM
Sunday, June 15, 2:00 PM - 5:00 PM`;
    const result = parseFormText(text, "FIST 2026");
    expect(result.title).toBe("FIST 2026");
    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].label).toBe(
      "Saturday, June 14, 7:00 PM - 10:00 PM"
    );
    expect(result.slots[1].label).toBe("Sunday, June 15, 2:00 PM - 5:00 PM");
    expect(result.slots[0].sortOrder).toBe(0);
    expect(result.slots[1].sortOrder).toBe(1);
  });

  it("uses 'Untitled Form' when no title provided", () => {
    const result = parseFormText("Saturday, June 14");
    expect(result.title).toBe("Untitled Form");
  });

  it("extracts group headers ending with colon", () => {
    const text = `Weekend 1:
Saturday, June 14, 7:00 PM
Sunday, June 15, 2:00 PM

Weekend 2:
Saturday, June 21, 7:00 PM`;
    const result = parseFormText(text);
    expect(result.slots).toHaveLength(3);
    expect(result.slots[0].groupLabel).toBe("Weekend 1");
    expect(result.slots[1].groupLabel).toBe("Weekend 1");
    expect(result.slots[2].groupLabel).toBe("Weekend 2");
  });

  it("handles numeric date formats", () => {
    const text = `6/14/2026
6/15/2026`;
    const result = parseFormText(text);
    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].label).toBe("6/14/2026");
  });

  it("handles short numeric dates without year", () => {
    const result = parseFormText("6/14\n6/15");
    expect(result.slots).toHaveLength(2);
  });

  it("skips blank lines", () => {
    const text = `Saturday, June 14

Sunday, June 15`;
    const result = parseFormText(text);
    expect(result.slots).toHaveLength(2);
  });

  it("returns empty slots for empty input", () => {
    const result = parseFormText("");
    expect(result.slots).toHaveLength(0);
  });

  it("returns empty slots for non-date text", () => {
    const result = parseFormText("Please select your availability below.");
    expect(result.slots).toHaveLength(0);
  });

  it("handles time-only lines with AM/PM", () => {
    const text = `7:00 PM - 10:00 PM
2:00 PM - 5:00 PM`;
    const result = parseFormText(text);
    expect(result.slots).toHaveLength(2);
  });

  it("handles all-caps group headers", () => {
    const text = `WEEKEND 1
Saturday, June 14, 7:00 PM`;
    const result = parseFormText(text);
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].groupLabel).toBe("WEEKEND 1");
  });

  it("handles a realistic Google Form paste", () => {
    const text = `When are you available for FIST 2026?

Weekend 1:
Saturday, June 14, 7:00 PM - 10:00 PM
Sunday, June 15, 2:00 PM - 5:00 PM

Weekend 2:
Friday, June 20, 8:00 PM - 11:00 PM
Saturday, June 21, 7:00 PM - 10:00 PM
Sunday, June 22, 2:00 PM - 5:00 PM`;
    const result = parseFormText(text, "FIST 2026 Availability");
    expect(result.title).toBe("FIST 2026 Availability");
    expect(result.slots).toHaveLength(5);
    expect(result.slots[0].groupLabel).toBe("Weekend 1");
    expect(result.slots[2].groupLabel).toBe("Weekend 2");
    expect(result.slots[4].sortOrder).toBe(4);
  });
});
