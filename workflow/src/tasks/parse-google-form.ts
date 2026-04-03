import { task } from "@renderinc/sdk/workflows";
import { extractFormData, FormData } from "../lib/extract-form-data";

export const parseGoogleForm = task(
  {
    name: "parseGoogleForm",
    timeoutSeconds: 30,
    retry: { maxRetries: 2, waitDurationMs: 1000, backoffScaling: 2 },
  },
  async function parseGoogleForm(formUrl: string): Promise<FormData> {
    throw new Error("test");
    const response = await fetch(formUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch form: ${response.status} ${response.statusText}`
      );
    }
    const html = await response.text();
    return extractFormData(html);
  }
);
