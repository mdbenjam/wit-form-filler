"use client";

import { useEffect, useState } from "react";

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
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
  onClose,
}: {
  date: string; // YYYY-MM-DD
  dateLabel: string;
  slots: DateSlot[];
  selections: Record<string, boolean>;
  onToggle: (slotId: string) => void;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [authNeeded, setAuthNeeded] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{dateLabel}</h2>
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
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selections[slot.id]
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
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
