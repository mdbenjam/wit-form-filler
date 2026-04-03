import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { parseFormText } from "@/lib/parse-form-text";
import { parseDateLabel } from "@/lib/parse-date-label";
import { parseGoogleForm, type Backend } from "@/lib/backends";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content, sourceUrl, backend: rawBackend } = body as {
    title?: string;
    content?: string;
    sourceUrl?: string;
    backend?: string;
  };
  const backend: Backend =
    rawBackend === "modal" ? "modal" :
    rawBackend === "trigger" ? "trigger" :
    "render";

  if (sourceUrl) {
    // URL mode: create form in PENDING, trigger workflow to parse
    const form = await prisma.form.create({
      data: {
        title: title || "Imported Form",
        sourceUrl,
        status: "PENDING",
      },
    });

    // Trigger workflow and update form when done (blocking ~5-10s)
    try {
      const result = await parseGoogleForm(sourceUrl, backend);
      console.log("Workflow result:", JSON.stringify(result, null, 2));

      let sortOrder = 0;
      const slotsToCreate = result.sections.flatMap((section) =>
        section.options.map((option) => ({
          label: option,
          date: parseDateLabel(option) ?? undefined,
          groupLabel: section.sectionTitle,
          sortOrder: sortOrder++,
        }))
      );

      await prisma.form.update({
        where: { id: form.id },
        data: {
          title: title || result.title,
          status: "READY",
          dateSlots: { create: slotsToCreate },
        },
      });

      const updated = await prisma.form.findUnique({
        where: { id: form.id },
        include: { dateSlots: { orderBy: { sortOrder: "asc" } } },
      });
      return Response.json(updated, { status: 201 });
    } catch (err) {
      console.error("Workflow error:", err);
      await prisma.form.update({
        where: { id: form.id },
        data: {
          status: "FAILED",
          errorMsg: err instanceof Error ? err.message : "Unknown error",
        },
      });
      return Response.json(
        { error: "Failed to parse Google Form", id: form.id },
        { status: 500 }
      );
    }
  }

  if (!content) {
    return Response.json(
      { error: "Either content or sourceUrl is required" },
      { status: 400 }
    );
  }

  // Paste mode: parse content synchronously
  const parsed = parseFormText(content, title);

  if (parsed.slots.length === 0) {
    return Response.json(
      { error: "No date/time slots found in the pasted content" },
      { status: 400 }
    );
  }

  const form = await prisma.form.create({
    data: {
      title: parsed.title,
      rawContent: content,
      status: "READY",
      dateSlots: {
        create: parsed.slots.map((slot) => ({
          label: slot.label,
          date: parseDateLabel(slot.label) ?? undefined,
          groupLabel: slot.groupLabel,
          sortOrder: slot.sortOrder,
        })),
      },
    },
    include: { dateSlots: true },
  });

  return Response.json(form, { status: 201 });
}
