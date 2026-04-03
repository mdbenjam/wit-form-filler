import { prisma } from "@/lib/db";

interface ResponseEntry {
  dateSlotId: string;
  available: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { userName, responses } = body as {
    userName?: string;
    responses?: ResponseEntry[];
  };

  if (!userName?.trim()) {
    return Response.json({ error: "userName is required" }, { status: 400 });
  }

  if (!responses || responses.length === 0) {
    return Response.json(
      { error: "responses array is required" },
      { status: 400 }
    );
  }

  // Verify the form exists and is READY
  const form = await prisma.form.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!form) {
    return Response.json({ error: "Form not found" }, { status: 404 });
  }

  if (form.status !== "READY") {
    return Response.json(
      { error: "Form is not ready for responses" },
      { status: 400 }
    );
  }

  // Upsert all responses in a transaction
  const results = await prisma.$transaction(
    responses.map((r) =>
      prisma.response.upsert({
        where: {
          dateSlotId_userName: {
            dateSlotId: r.dateSlotId,
            userName: userName.trim(),
          },
        },
        update: { available: r.available },
        create: {
          dateSlotId: r.dateSlotId,
          userName: userName.trim(),
          available: r.available,
        },
      })
    )
  );

  return Response.json({ saved: results.length });
}
