import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ResponseForm } from "@/components/response-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FormPage({
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
      },
    },
  });

  if (!form) notFound();

  if (form.status === "PENDING") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
        <p className="text-gray-600">
          This form is still being processed. Please refresh in a moment.
        </p>
      </div>
    );
  }

  if (form.status === "FAILED") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
        <p className="text-red-600">
          Failed to process this form: {form.errorMsg || "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
        <Link
          href={`/forms/${form.id}/results`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View Results
        </Link>
      </div>

      <ResponseForm formId={form.id} dateSlots={form.dateSlots} />
    </div>
  );
}
