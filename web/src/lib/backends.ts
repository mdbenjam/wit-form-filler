import { triggerParseGoogleForm } from "./workflow";
import { triggerParseGoogleFormModal } from "./modal";
import { triggerParseGoogleFormTrigger } from "./trigger";

interface FormSection {
  sectionTitle: string | null;
  options: string[];
}

interface FormData {
  title: string;
  sections: FormSection[];
}

export type Backend = "render" | "modal" | "trigger";

export async function parseGoogleForm(
  url: string,
  backend: Backend
): Promise<FormData> {
  switch (backend) {
    case "render":
      return triggerParseGoogleForm(url);
    case "modal":
      return triggerParseGoogleFormModal(url);
    case "trigger":
      return triggerParseGoogleFormTrigger(url);
  }
}
