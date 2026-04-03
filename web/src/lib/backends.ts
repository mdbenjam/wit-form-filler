import { triggerParseGoogleForm } from "./workflow";
import { triggerParseGoogleFormModal } from "./modal";

interface FormSection {
  sectionTitle: string | null;
  options: string[];
}

interface FormData {
  title: string;
  sections: FormSection[];
}

export type Backend = "render" | "modal";

export async function parseGoogleForm(
  url: string,
  backend: Backend
): Promise<FormData> {
  switch (backend) {
    case "render":
      return triggerParseGoogleForm(url);
    case "modal":
      return triggerParseGoogleFormModal(url);
  }
}
