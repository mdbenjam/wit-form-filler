import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!form) {
    return Response.json({ error: "Form not found" }, { status: 404 });
  }

  // Build a grid-friendly response:
  // { form, people: string[], grid: { [userName]: { [dateSlotId]: boolean } } }
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

  return Response.json({
    form: {
      id: form.id,
      title: form.title,
      status: form.status,
    },
    dateSlots: form.dateSlots.map((s) => ({
      id: s.id,
      label: s.label,
      groupLabel: s.groupLabel,
      sortOrder: s.sortOrder,
    })),
    people: Array.from(peopleSet).sort(),
    grid,
  });
}
