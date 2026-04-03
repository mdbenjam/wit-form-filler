import json
import re
from dataclasses import dataclass, field
from typing import Optional

from bs4 import BeautifulSoup


@dataclass
class FormSection:
    section_title: Optional[str]
    options: list[str]


@dataclass
class FormData:
    title: str
    sections: list[FormSection] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "sections": [
                {
                    "sectionTitle": s.section_title,
                    "options": s.options,
                }
                for s in self.sections
            ],
        }


DATE_TIME_PATTERN = re.compile(
    r"\b(mon|tue|wed|thu|fri|sat|sun"
    r"|january|february|march|april|may|june|july|august|september|october|november|december"
    r"|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec"
    r"|\d{1,2}/\d{1,2}"
    r"|\d{1,2}:\d{2}\s*(?:am|pm)?)\b",
    re.IGNORECASE,
)


def _is_date_time_option(text: str) -> bool:
    return bool(DATE_TIME_PATTERN.search(text))


def filter_date_sections(sections: list[FormSection]) -> list[FormSection]:
    result = []
    for s in sections:
        if not any(_is_date_time_option(o) for o in s.options):
            continue
        filtered_options = [
            o for o in s.options if o.strip() != "" and _is_date_time_option(o)
        ]
        result.append(FormSection(section_title=s.section_title, options=filtered_options))
    return result


def parse_from_load_data(html: str) -> Optional[FormData]:
    match = re.search(
        r"var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*</script>", html
    )
    if not match:
        return None

    try:
        data = json.loads(match.group(1))
    except (json.JSONDecodeError, ValueError):
        return None

    if not isinstance(data, list):
        return None

    form_info = data[1] if len(data) > 1 else None
    if not isinstance(form_info, list):
        return None

    title = form_info[8] if len(form_info) > 8 and isinstance(form_info[8], str) else "Google Form"

    items = form_info[1] if len(form_info) > 1 else None
    if not isinstance(items, list):
        return FormData(title=title)

    sections: list[FormSection] = []

    for item in items:
        if not isinstance(item, list):
            continue

        section_title = item[1] if len(item) > 1 and isinstance(item[1], str) else None
        question_type = item[3] if len(item) > 3 else None
        question_parts = item[4] if len(item) > 4 else None

        if question_type != 4 or not isinstance(question_parts, list):
            continue

        for part in question_parts:
            if not isinstance(part, list):
                continue

            options_array = part[1] if len(part) > 1 else None
            if not isinstance(options_array, list):
                continue

            options: list[str] = []
            for opt in options_array:
                if isinstance(opt, list) and len(opt) > 0 and isinstance(opt[0], str):
                    options.append(opt[0])

            if options:
                sections.append(FormSection(section_title=section_title, options=options))

    return FormData(title=title, sections=sections)


def parse_from_html(html: str) -> FormData:
    soup = BeautifulSoup(html, "html.parser")

    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"]
    elif soup.title and soup.title.string:
        title = re.sub(r"\s*-\s*Google Forms$", "", soup.title.string)
    else:
        title = "Google Form"

    sections: list[FormSection] = []

    for group in soup.find_all(attrs={"role": ["group", "listbox"]}):
        data_params_parent = group.find_parent(attrs={"data-params": True})
        heading_el = data_params_parent.find(attrs={"role": "heading"}) if data_params_parent else None
        section_title = heading_el.get_text(strip=True) if heading_el else None

        options: list[str] = []
        for opt in group.find_all(attrs={"data-answer-value": True}):
            val = opt.get("data-answer-value")
            if val:
                options.append(val)

        if not options:
            for opt in group.find_all(attrs={"data-value": True}):
                val = opt.get("data-value")
                if val:
                    options.append(val)

        if not options:
            for opt in group.find_all(["label", lambda tag: tag.get("role") == "option"]):
                text = opt.get_text(strip=True)
                if text:
                    options.append(text)

        if options:
            sections.append(FormSection(section_title=section_title, options=options))

    return FormData(title=title, sections=sections)


def extract_form_data(html: str) -> FormData:
    load_data_result = parse_from_load_data(html)
    raw = load_data_result if load_data_result is not None else parse_from_html(html)

    return FormData(
        title=raw.title,
        sections=filter_date_sections(raw.sections),
    )
