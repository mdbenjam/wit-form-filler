"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseDateRange } from "@/lib/parse-date-label";
import { checkSlotOverlap, type OverlapResult } from "@/lib/overlap";

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  startISO: string;
  endISO: string;
  allDay: boolean;
}

interface DateSlot {
  id: string;
  label: string;
  date: string | null;
  groupLabel: string | null;
  sortOrder: number;
}

export function DayDetailPanel({
  date,
  dateLabel,
  slots,
  selections,
  onToggle,
  onSelectSlots,
  onClose,
  onPrevDate,
  onNextDate,
  hasPrevDate,
  hasNextDate,
}: {
  date: string; // YYYY-MM-DD
  dateLabel: string;
  slots: DateSlot[];
  selections: Record<string, boolean>;
  onToggle: (slotId: string) => void;
  onSelectSlots: (slotIds: string[]) => void;
  onClose: () => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  hasPrevDate: boolean;
  hasNextDate: boolean;
}) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [authNeeded, setAuthNeeded] = useState(false);

  const slotOverlaps = useMemo(() => {
    if (!events) return {} as Record<string, OverlapResult>;
    const map: Record<string, OverlapResult> = {};
    for (const slot of slots) {
      const range = parseDateRange(slot.label, undefined, "America/New_York");
      map[slot.id] = checkSlotOverlap(range, events);
    }
    return map;
  }, [events, slots]);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setAuthNeeded(false);

    fetch(`/api/calendar/events?date=${date}`)
      .then((res) => {
        if (res.status === 401) {
          setAuthNeeded(true);
          setEvents(null);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) {
          setEvents(data);
        }
      })
      .catch(() => {
        if (!cancelled) setEvents(null);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrevDate) {
        e.preventDefault();
        onPrevDate();
      } else if (e.key === "ArrowRight" && hasNextDate) {
        e.preventDefault();
        onNextDate();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "a") {
        e.preventDefault();
        onSelectSlots(slots.map((s) => s.id));
      } else if (e.key === "g") {
        e.preventDefault();
        const freeSlots = slots.filter((s) => slotOverlaps[s.id] === "free");
        if (freeSlots.length > 0) onSelectSlots(freeSlots.map((s) => s.id));
      }
    },
    [hasPrevDate, hasNextDate, onPrevDate, onNextDate, onClose, onSelectSlots, slots, slotOverlaps],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevDate}
              disabled={!hasPrevDate}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous date"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{dateLabel}</h2>
            <button
              type="button"
              onClick={onNextDate}
              disabled={!hasNextDate}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next date"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Google Calendar section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Your Calendar
            </h3>
            {eventsLoading && (
              <p className="text-sm text-gray-400">Loading events...</p>
            )}
            {authNeeded && (
              <a
                href={`/api/auth/google?returnTo=${encodeURIComponent(
                  window.location.pathname
                )}`}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign in with Google
              </a>
            )}
            {events && events.length === 0 && (
              <p className="text-sm text-gray-400">No events this day</p>
            )}
            {events && events.length > 0 && (
              <ul className="space-y-2">
                {events.map((event, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-gray-200 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {event.summary}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.allDay
                        ? "All day"
                        : `${event.start} – ${event.end}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Available slots section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Available Slots
            </h3>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-400">No slots for this date</p>
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onToggle(slot.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors flex items-center gap-2 ${
                      selections[slot.id]
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {slotOverlaps[slot.id] === "free" && (
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="No conflicts" />
                    )}
                    {slotOverlaps[slot.id] === "conflict" && (
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500 flex-shrink-0" title="Conflicts with calendar" />
                    )}
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
