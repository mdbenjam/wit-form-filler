import { tasks, runs } from "@trigger.dev/sdk/v3";

interface FormSection {
  sectionTitle: string | null;
  options: string[];
}

interface FormData {
  title: string;
  sections: FormSection[];
}

export async function triggerParseGoogleFormTrigger(
  formUrl: string
): Promise<FormData> {
  const handle = await tasks.trigger(
    "parse-google-form",
    { formUrl }
  );
  const run = await runs.poll(handle, { pollIntervalMs: 500 });
  if (run.output) {
    return run.output as unknown as FormData;
  }
  throw new Error(`Trigger.dev task failed: ${run.status}`);
}
