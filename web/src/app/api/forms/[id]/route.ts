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
          _count: { select: { responses: true } },
        },
      },
    },
  });

  if (!form) {
    return Response.json({ error: "Form not found" }, { status: 404 });
  }

  return Response.json(form);
}
