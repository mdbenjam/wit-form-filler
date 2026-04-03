interface FormSection {
  sectionTitle: string | null;
  options: string[];
}

interface FormData {
  title: string;
  sections: FormSection[];
}

export async function triggerParseGoogleFormModal(
  formUrl: string
): Promise<FormData> {
  const endpoint = process.env.MODAL_ENDPOINT_URL;
  if (!endpoint) {
    throw new Error("MODAL_ENDPOINT_URL not configured");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formUrl }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Modal endpoint returned ${response.status}: ${text}`);
  }

  return response.json() as Promise<FormData>;
}
