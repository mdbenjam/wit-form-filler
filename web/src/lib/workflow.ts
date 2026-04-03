import { Render } from "@renderinc/sdk";

interface FormSection {
  sectionTitle: string | null;
  options: string[];
}

interface FormData {
  title: string;
  sections: FormSection[];
}

let renderClient: Render | null = null;

function getRenderClient(): Render {
  if (!renderClient) {
    renderClient = new Render();
  }
  return renderClient;
}

export async function triggerParseGoogleForm(
  formUrl: string
): Promise<FormData> {
  const slug = process.env.WORKFLOW_SERVICE_SLUG;
  if (!slug) {
    throw new Error("WORKFLOW_SERVICE_SLUG not configured");
  }

  const render = getRenderClient();
  const taskRun = await render.workflows.startTask(
    `${slug}/parseGoogleForm`,
    [formUrl]
  );
  const taskRunResult = await taskRun.get() as unknown as {
    results: FormData[];
  };
  return taskRunResult.results[0];
}
