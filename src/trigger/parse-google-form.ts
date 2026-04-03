import { task } from "@trigger.dev/sdk/v3";
import { extractFormData } from "../../workflow/src/lib/extract-form-data";

export const parseGoogleFormTask = task({
  id: "parse-google-form",
  maxDuration: 30,
  run: async (payload: { formUrl: string }) => {
    const response = await fetch(payload.formUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch form: ${response.status} ${response.statusText}`
      );
    }
    const html = await response.text();
    return extractFormData(html);
  },
});
