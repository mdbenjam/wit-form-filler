import { describe, it, expect } from "vitest";
import {
  extractFormData,
  filterDateSections,
  parseFromLoadData,
  parseFromHtml,
} from "./extract-form-data";

describe("parseFromLoadData", () => {
  it("returns null when no FB_PUBLIC_LOAD_DATA_ found", () => {
    expect(parseFromLoadData("<html><body>hello</body></html>")).toBeNull();
  });

  it("returns null when JSON is invalid", () => {
    const html = `<script>var FB_PUBLIC_LOAD_DATA_ = {broken json;</script>`;
    expect(parseFromLoadData(html)).toBeNull();
  });

  it("parses checkbox questions from load data", () => {
    // Simulated Google Form structure with a checkbox question (type 4)
    const formData = [
      null, // [0]
      [
        // [1] = form info
        null, // [1][0]
        [
          // [1][1] = items array
          [
            null, // item[0]
            "When are you available?", // item[1] = question title
            null, // item[2]
            4, // item[3] = type (4 = checkbox)
            [
              // item[4] = question parts
              [
                null, // part[0]
                [
                  // part[1] = options
                  ["Saturday, June 14, 7:00 PM"],
                  ["Sunday, June 15, 2:00 PM"],
                  ["Saturday, June 21, 7:00 PM"],
                ],
              ],
            ],
          ],
        ],
        null,
        null,
        null,
        null,
        null,
        null,
        "FIST 2026 Availability", // [1][8] = title
      ],
    ];

    const html = `<html><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(formData)};</script></html>`;
    const result = parseFromLoadData(html);

    expect(result).not.toBeNull();
    expect(result!.title).toBe("FIST 2026 Availability");
    expect(result!.sections).toHaveLength(1);
    expect(result!.sections[0].sectionTitle).toBe(
      "When are you available?"
    );
    expect(result!.sections[0].options).toEqual([
      "Saturday, June 14, 7:00 PM",
      "Sunday, June 15, 2:00 PM",
      "Saturday, June 21, 7:00 PM",
    ]);
  });

  it("skips non-checkbox questions", () => {
    const formData = [
      null,
      [
        null,
        [
          [
            null,
            "What is your name?",
            null,
            0, // item[3] = type 0 = short answer
            [
              [
                null,
                null, // no options for text input
              ],
            ],
          ],
        ],
        null,
        null,
        null,
        null,
        null,
        null,
        "Test Form",
      ],
    ];

    const html = `<html><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(formData)};</script></html>`;
    const result = parseFromLoadData(html);
    expect(result!.sections).toHaveLength(0);
  });
});

describe("parseFromHtml", () => {
  it("extracts title from og:title meta tag", () => {
    const html = `<html><head><meta property="og:title" content="My Form"></head><body></body></html>`;
    const result = parseFromHtml(html);
    expect(result.title).toBe("My Form");
  });

  it("falls back to page title", () => {
    const html = `<html><head><title>Cool Form - Google Forms</title></head><body></body></html>`;
    const result = parseFromHtml(html);
    expect(result.title).toBe("Cool Form");
  });

  it("extracts options from data-answer-value attributes", () => {
    const html = `
      <html><body>
        <div role="group">
          <div data-answer-value="Option A"></div>
          <div data-answer-value="Option B"></div>
        </div>
      </body></html>
    `;
    const result = parseFromHtml(html);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].options).toEqual(["Option A", "Option B"]);
  });

  it("returns empty sections when no recognizable structure", () => {
    const html = `<html><body><p>Just some text</p></body></html>`;
    const result = parseFromHtml(html);
    expect(result.sections).toHaveLength(0);
  });
});

describe("filterDateSections", () => {
  it("keeps sections with date/time options", () => {
    const sections = [
      {
        sectionTitle: "Weekend 1",
        options: ["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"],
      },
    ];
    const result = filterDateSections(sections);
    expect(result).toHaveLength(1);
    expect(result[0].options).toEqual([
      "FRI 3/13 at 7:30PM",
      "SAT 3/14 at 3:00PM",
    ]);
  });

  it("removes non-date checkbox sections", () => {
    const sections = [
      {
        sectionTitle: "What kind of group?",
        options: ["WIT company ensemble", "On-going indie team"],
      },
      {
        sectionTitle: "Weekend 1",
        options: ["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"],
      },
    ];
    const result = filterDateSections(sections);
    expect(result).toHaveLength(1);
    expect(result[0].sectionTitle).toBe("Weekend 1");
  });

  it("strips empty strings and non-date options from date sections", () => {
    const sections = [
      {
        sectionTitle: "Weekend 1",
        options: ["FRI 3/13 at 7:30PM", "Not Available This Weekend", ""],
      },
    ];
    const result = filterDateSections(sections);
    expect(result[0].options).toEqual(["FRI 3/13 at 7:30PM"]);
  });
});

describe("extractFormData", () => {
  it("prefers FB_PUBLIC_LOAD_DATA_ over HTML parsing", () => {
    const formData = [
      null,
      [
        null,
        [
          [
            null,
            "Dates",
            null,
            4,
            [[null, [["Sat June 14"]]]],
          ],
        ],
        null,
        null,
        null,
        null,
        null,
        null,
        "From Load Data",
      ],
    ];

    const html = `
      <html>
      <head><meta property="og:title" content="From HTML"></head>
      <body>
        <script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(formData)};</script>
        <div role="group"><div data-answer-value="FRI 3/13 at 7:30PM"></div></div>
      </body>
      </html>
    `;

    const result = extractFormData(html);
    expect(result.title).toBe("From Load Data");
    expect(result.sections[0].options).toEqual(["Sat June 14"]);
  });

  it("falls back to HTML when load data is absent", () => {
    const html = `
      <html>
      <head><meta property="og:title" content="HTML Form"></head>
      <body>
        <div role="group"><div data-answer-value="FRI 3/13 at 7:30PM"></div></div>
      </body>
      </html>
    `;

    const result = extractFormData(html);
    expect(result.title).toBe("HTML Form");
    expect(result.sections[0].options).toEqual(["FRI 3/13 at 7:30PM"]);
  });

  it("filters out non-date checkbox sections", () => {
    const formData = [
      null,
      [
        null,
        [
          [null, "What kind of group?", null, 4, [[null, [["Ensemble"], ["Indie team"]]]]],
          [null, "Weekend 1", null, 4, [[null, [["FRI 3/13 at 7:30PM"], ["SAT 3/14 at 3:00PM"], ["Not Available This Weekend"], [""]]]]]
        ],
        null, null, null, null, null, null,
        "FIST 2026",
      ],
    ];

    const html = `<html><script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify(formData)};</script></html>`;
    const result = extractFormData(html);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].sectionTitle).toBe("Weekend 1");
    expect(result.sections[0].options).toEqual(["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"]);
  });
});
