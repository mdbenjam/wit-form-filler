import * as cheerio from "cheerio";

export interface FormSection {
  sectionTitle: string | null;
  options: string[];
}

export interface FormData {
  title: string;
  sections: FormSection[];
}

/**
 * Extracts form data from Google Form HTML.
 * Tries FB_PUBLIC_LOAD_DATA_ JSON blob first, falls back to HTML parsing.
 * Filters to only date/time sections.
 */
export function extractFormData(html: string): FormData {
  const loadDataResult = parseFromLoadData(html);
  const raw = loadDataResult ?? parseFromHtml(html);

  return {
    title: raw.title,
    sections: filterDateSections(raw.sections),
  };
}

/**
 * Keeps only sections where at least some options look like dates/times.
 * Also strips empty strings and "Not Available" entries from options.
 */
export function filterDateSections(sections: FormSection[]): FormSection[] {
  return sections
    .filter((s) => s.options.some(isDateTimeOption))
    .map((s) => ({
      ...s,
      options: s.options.filter((o) => o.trim() !== "" && isDateTimeOption(o)),
    }));
}

const DATE_TIME_PATTERN =
  /\b(mon|tue|wed|thu|fri|sat|sun|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}\s*(am|pm)?)\b/i;

function isDateTimeOption(text: string): boolean {
  return DATE_TIME_PATTERN.test(text);
}

/**
 * Parses Google Form data from the FB_PUBLIC_LOAD_DATA_ JavaScript variable.
 *
 * Google Forms embed all form structure in a JS variable like:
 *   var FB_PUBLIC_LOAD_DATA_ = [...deeply nested arrays...];
 *
 * The structure (as of 2025):
 * - [1][1] = form title
 * - [1][1] or root level arrays contain question groups
 * - Checkbox questions have type indicator 4
 * - Each option is a nested array with the label at index [0]
 */
export function parseFromLoadData(html: string): FormData | null {
  const match = html.match(
    /var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/
  );
  if (!match) return null;

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }

  if (!Array.isArray(data)) return null;

  // data[1][8] is the form title in most observed structures
  // data[1][1] is an array of question groups
  const formInfo = (data as unknown[])[1];
  if (!Array.isArray(formInfo)) return null;

  const title = typeof formInfo[8] === "string" ? formInfo[8] : "Google Form";

  // formInfo[1] contains the list of form items/questions
  const items = formInfo[1];
  if (!Array.isArray(items)) return { title, sections: [] };

  const sections: FormSection[] = [];

  for (const item of items) {
    if (!Array.isArray(item)) continue;

    // item[1] = question title
    // item[3] = question type (4 = checkboxes)
    // item[4] = array of question parts containing options
    const sectionTitle =
      typeof item[1] === "string" ? item[1] : null;
    const questionType = item[3];
    const questionParts = item[4];

    if (questionType !== 4 || !Array.isArray(questionParts)) continue;

    for (const part of questionParts) {
      if (!Array.isArray(part)) continue;

      // part[1] = array of options
      const optionsArray = part[1];
      if (!Array.isArray(optionsArray)) continue;

      const options: string[] = [];
      for (const opt of optionsArray) {
        if (Array.isArray(opt) && typeof opt[0] === "string") {
          options.push(opt[0]);
        }
      }

      if (options.length > 0) {
        sections.push({ sectionTitle, options });
      }
    }
  }

  return { title, sections };
}

/**
 * Fallback: parses Google Form HTML using cheerio to find checkbox options.
 */
export function parseFromHtml(html: string): FormData {
  const $ = cheerio.load(html);

  // Try to get the form title
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().replace(/ - Google Forms$/, "") ||
    "Google Form";

  const sections: FormSection[] = [];

  // Google Forms renders checkbox groups in div containers
  // Each group has a heading and a list of options with data-value or label text
  $('[role="group"], [role="listbox"], .freebirdFormviewerComponentsQuestionCheckboxRoot').each(
    (_i, group) => {
      const $group = $(group);
      const sectionTitle =
        $group
          .closest('[data-params]')
          .find('[role="heading"]')
          .text()
          .trim() || null;

      const options: string[] = [];
      $group.find('[data-answer-value], [data-value]').each((_j, opt) => {
        const val =
          $(opt).attr("data-answer-value") || $(opt).attr("data-value");
        if (val) options.push(val);
      });

      // Fallback: look for label text
      if (options.length === 0) {
        $group.find('label, [role="option"]').each((_j, opt) => {
          const text = $(opt).text().trim();
          if (text) options.push(text);
        });
      }

      if (options.length > 0) {
        sections.push({ sectionTitle, options });
      }
    }
  );

  return { title, sections };
}
