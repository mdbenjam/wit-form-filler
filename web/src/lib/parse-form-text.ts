export interface ParsedSlot {
  label: string;
  groupLabel?: string;
  sortOrder: number;
}

export interface ParsedForm {
  title: string;
  slots: ParsedSlot[];
}

/**
 * Parses pasted text from a Google Form (or similar) into date slots.
 *
 * Expected formats:
 * - Lines that look like dates: "Saturday, June 14, 7:00 PM - 10:00 PM"
 * - Lines preceded by a group header (e.g. "Weekend 1:")
 * - Simple lists of dates, one per line
 *
 * Blank lines and lines that look like headers/instructions are preserved
 * as group labels for the slots that follow them.
 */
export function parseFormText(text: string, title?: string): ParsedForm {
  const lines = text.split("\n").map((l) => l.trim());
  const slots: ParsedSlot[] = [];
  let currentGroup: string | undefined;
  let sortOrder = 0;

  for (const line of lines) {
    if (line === "") {
      continue;
    }

    if (isGroupHeader(line)) {
      currentGroup = cleanGroupHeader(line);
      continue;
    }

    if (isDateLike(line)) {
      slots.push({
        label: line,
        groupLabel: currentGroup,
        sortOrder: sortOrder++,
      });
    }
  }

  return {
    title: title || "Untitled Form",
    slots,
  };
}

const DAY_NAMES =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i;
const MONTH_NAMES =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
const TIME_PATTERN = /\b\d{1,2}:\d{2}\s*(am|pm)?\b/i;
const DATE_NUMERIC = /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/;

function isDateLike(line: string): boolean {
  const checks = [DAY_NAMES, MONTH_NAMES, TIME_PATTERN, DATE_NUMERIC];
  return checks.some((pattern) => pattern.test(line));
}

/**
 * Group headers are lines ending with ":" or lines that are all caps / short
 * and don't contain date-like content.
 */
function isGroupHeader(line: string): boolean {
  if (line.endsWith(":")) return true;
  if (line.length <= 30 && !isDateLike(line) && /^[A-Z\s\d]+$/.test(line)) {
    return true;
  }
  return false;
}

function cleanGroupHeader(line: string): string {
  return line.replace(/:$/, "").trim();
}
