import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ResultsGrid } from "@/components/results-grid";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      dateSlots: {
        orderBy: { sortOrder: "asc" },
        include: {
          responses: {
            orderBy: { userName: "asc" },
          },
        },
      },
    },
  });

  if (!form) notFound();

  // Build grid data
  const peopleSet = new Set<string>();
  const grid: Record<string, Record<string, boolean>> = {};

  for (const slot of form.dateSlots) {
    for (const response of slot.responses) {
      peopleSet.add(response.userName);
      if (!grid[response.userName]) {
        grid[response.userName] = {};
      }
      grid[response.userName][slot.id] = response.available;
    }
  }

  const people = Array.from(peopleSet).sort();
  const dateSlots = form.dateSlots.map((s) => ({
    id: s.id,
    label: s.label,
    groupLabel: s.groupLabel,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
        <Link
          href={`/forms/${form.id}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Add Response
        </Link>
      </div>

      {people.length === 0 ? (
        <p className="text-gray-500">No responses yet.</p>
      ) : (
        <ResultsGrid dateSlots={dateSlots} people={people} grid={grid} />
      )}
    </div>
  );
}
