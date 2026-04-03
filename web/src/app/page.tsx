import { prisma } from "@/lib/db";
import Link from "next/link";
import { CreateFormSection } from "@/components/create-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { dateSlots: true } },
    },
  });

  return (
    <div className="space-y-8">
      <CreateFormSection />

      {forms.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Existing Forms
          </h2>
          <ul className="space-y-2">
            {forms.map((form) => (
              <li key={form.id}>
                <Link
                  href={`/forms/${form.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {form.title}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {form._count.dateSlots} date
                        {form._count.dateSlots !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        form.status === "READY"
                          ? "bg-green-100 text-green-700"
                          : form.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {form.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
