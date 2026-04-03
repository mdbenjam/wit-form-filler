"use client";

import { useState } from "react";

interface DateSlot {
  id: string;
  label: string;
  groupLabel: string | null;
  sortOrder: number;
}

export function ResponseForm({
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

  // Group slots by groupLabel
  const groups = groupSlots(dateSlots);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select the dates you&apos;re available:
        </p>
        {groups.map((group) => (
          <div key={group.label || "ungrouped"}>
            {group.label && (
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {group.label}
              </h3>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {group.slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => toggle(slot.id)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    selections[slot.id]
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

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

function groupSlots(
  slots: DateSlot[]
): { label: string | null; slots: DateSlot[] }[] {
  const groups: { label: string | null; slots: DateSlot[] }[] = [];
  let currentGroup: (typeof groups)[0] | null = null;

  for (const slot of slots) {
    if (!currentGroup || currentGroup.label !== slot.groupLabel) {
      currentGroup = { label: slot.groupLabel, slots: [] };
      groups.push(currentGroup);
    }
    currentGroup.slots.push(slot);
  }

  return groups;
}
