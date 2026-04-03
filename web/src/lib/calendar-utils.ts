export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface MonthYear {
  year: number;
  month: number; // 0-indexed
}

/**
 * Builds a 2D array representing a calendar month grid (7 columns, Sun-Sat).
 * Includes padding days from previous/next months to fill complete weeks.
 */
export function buildCalendarMonth(year: number, month: number, today?: Date): CalendarDay[][] {
  const todayDate = today ?? new Date();
  const todayKey = formatDateKey(todayDate);

  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun

  // Start from the Sunday before (or on) the 1st
  const gridStart = new Date(year, month, 1 - startDow);

  const weeks: CalendarDay[][] = [];
  let current = new Date(gridStart);

  // Build up to 6 weeks (covers any month layout)
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month && current.getFullYear() === year,
        isToday: formatDateKey(current) === todayKey,
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);

    // Stop if we've passed the end of the target month
    if (current.getMonth() !== month && current.getDay() === 0) {
      break;
    }
  }

  return weeks;
}

/**
 * Groups date slots by their date (YYYY-MM-DD key).
 * Slots without a parsed date are excluded.
 */
export function groupSlotsByDate<T extends { date: string | null }>(
  slots: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const slot of slots) {
    if (!slot.date) continue;
    const key = slot.date.slice(0, 10); // "YYYY-MM-DD"
    const existing = map.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      map.set(key, [slot]);
    }
  }
  return map;
}

/**
 * Returns sorted unique months that have slots with parsed dates.
 */
export function getSlotMonths<T extends { date: string | null }>(
  slots: T[]
): MonthYear[] {
  const seen = new Set<string>();
  const months: MonthYear[] = [];

  for (const slot of slots) {
    if (!slot.date) continue;
    const d = new Date(slot.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  months.sort((a, b) => a.year - b.year || a.month - b.month);
  return months;
}

/**
 * Formats a Date as "YYYY-MM-DD".
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
