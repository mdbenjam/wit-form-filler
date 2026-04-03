"use client";

import { useState, useMemo } from "react";
import {
  buildCalendarMonth,
  groupSlotsByDate,
  getSlotMonths,
  formatDateKey,
} from "@/lib/calendar-utils";
import { DayDetailPanel } from "./day-detail-panel";

interface DateSlot {
  id: string;
  label: string;
  date: string | null;
  groupLabel: string | null;
  sortOrder: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CalendarResponseForm({
  formId,
  dateSlots,
}: {
  formId: string;
  dateSlots: DateSlot[];
}) {
  const [userName, setUserName] = useState("");
  const [selections, setSelections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(dateSlots.map((s) => [s.id, false]))
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const slotsByDate = useMemo(() => groupSlotsByDate(dateSlots), [dateSlots]);
  const months = useMemo(() => getSlotMonths(dateSlots), [dateSlots]);

  const [monthIndex, setMonthIndex] = useState(0);
  const currentMonth = months[monthIndex] ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  };

  const weeks = useMemo(
    () => buildCalendarMonth(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

  function toggle(slotId: string) {
    setSelections((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const responses = dateSlots.map((slot) => ({
        dateSlotId: slot.id,
        available: selections[slot.id],
      }));

      const res = await fetch(`/api/forms/${formId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: userName.trim(), responses }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Count how many slots are selected
  const selectedCount = Object.values(selections).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name input */}
      <div>
        <label
          htmlFor="userName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your Name
        </label>
        <input
          id="userName"
          type="text"
          required
          value={userName}
          onChange={(e) => {
            setUserName(e.target.value);
            setSuccess(false);
          }}
          placeholder="Enter your name"
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <p className="text-sm text-gray-600">
        Click a date to see time slots and mark your availability.
        {selectedCount > 0 && (
          <span className="ml-1 font-medium text-green-700">
            {selectedCount} slot{selectedCount !== 1 ? "s" : ""} selected
          </span>
        )}
      </p>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={monthIndex <= 0}
          onClick={() => setMonthIndex((i) => i - 1)}
          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &larr; Prev
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
        </h2>
        <button
          type="button"
          disabled={monthIndex >= months.length - 1}
          onClick={() => setMonthIndex((i) => i + 1)}
          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next &rarr;
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
            {week.map((day) => {
              const key = formatDateKey(day.date);
              const hasSlots = slotsByDate.has(key);
              const isSelected = selectedDate === key;
              const daySlots = slotsByDate.get(key) ?? [];
              const allSelected =
                daySlots.length > 0 &&
                daySlots.every((s) => selections[s.id]);
              const someSelected =
                daySlots.length > 0 &&
                daySlots.some((s) => selections[s.id]) &&
                !allSelected;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!hasSlots}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`relative py-3 text-center text-sm transition-colors ${
                    !day.isCurrentMonth
                      ? "text-gray-300"
                      : hasSlots
                        ? isSelected
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : allSelected
                            ? "bg-green-50 text-green-800 font-medium hover:bg-green-100"
                            : "text-gray-900 hover:bg-gray-50"
                        : "text-gray-400 cursor-default"
                  } ${day.isToday ? "font-bold" : ""}`}
                >
                  {day.date.getDate()}
                  {/* Dot indicator for days with slots */}
                  {hasSlots && day.isCurrentMonth && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${
                        allSelected
                          ? "bg-green-500"
                          : someSelected
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          dateLabel={formatDayLabel(selectedDate)}
          slots={slotsByDate.get(selectedDate) ?? []}
          selections={selections}
          onToggle={toggle}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">Responses saved!</p>
      )}

      <button
        type="submit"
        disabled={loading || !userName.trim()}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Submit"}
      </button>
    </form>
  );
}
