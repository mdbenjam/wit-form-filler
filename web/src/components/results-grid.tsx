interface DateSlot {
  id: string;
  label: string;
  groupLabel: string | null;
}

export function ResultsGrid({
  dateSlots,
  people,
  grid,
}: {
  dateSlots: DateSlot[];
  people: string[];
  grid: Record<string, Record<string, boolean>>;
}) {
  // Count available people per slot
  const availableCounts = dateSlots.map((slot) => {
    let count = 0;
    for (const person of people) {
      if (grid[person]?.[slot.id]) count++;
    }
    return count;
  });

  const maxAvailable = Math.max(...availableCounts, 1);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-gray-500 border-b">
              Name
            </th>
            {dateSlots.map((slot) => (
              <th
                key={slot.id}
                className="px-3 py-2 text-center font-medium text-gray-700 border-b whitespace-nowrap"
              >
                <div className="text-xs text-gray-400">{slot.groupLabel}</div>
                <div>{slot.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person} className="border-b border-gray-100">
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                {person}
              </td>
              {dateSlots.map((slot) => {
                const available = grid[person]?.[slot.id] ?? false;
                return (
                  <td key={slot.id} className="px-3 py-2 text-center">
                    <span
                      className={`inline-block h-6 w-6 rounded ${
                        available ? "bg-green-400" : "bg-red-200"
                      }`}
                      title={available ? "Available" : "Not available"}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300">
            <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-gray-900">
              Total
            </td>
            {availableCounts.map((count, i) => (
              <td key={dateSlots[i].id} className="px-3 py-2 text-center">
                <span
                  className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                    count === maxAvailable
                      ? "bg-green-100 text-green-800"
                      : count === 0
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {count}/{people.length}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
