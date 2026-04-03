import json

from lib.extract_form_data import (
    extract_form_data,
    filter_date_sections,
    parse_from_html,
    parse_from_load_data,
    FormSection,
)


class TestParseFromLoadData:
    def test_returns_none_when_no_load_data(self):
        assert parse_from_load_data("<html><body>hello</body></html>") is None

    def test_returns_none_when_json_is_invalid(self):
        html = "<script>var FB_PUBLIC_LOAD_DATA_ = {broken json;</script>"
        assert parse_from_load_data(html) is None

    def test_parses_checkbox_questions(self):
        form_data = [
            None,
            [
                None,
                [
                    [
                        None,
                        "When are you available?",
                        None,
                        4,
                        [
                            [
                                None,
                                [
                                    ["Saturday, June 14, 7:00 PM"],
                                    ["Sunday, June 15, 2:00 PM"],
                                    ["Saturday, June 21, 7:00 PM"],
                                ],
                            ],
                        ],
                    ],
                ],
                None, None, None, None, None, None,
                "FIST 2026 Availability",
            ],
        ]
        html = f"<html><script>var FB_PUBLIC_LOAD_DATA_ = {json.dumps(form_data)};</script></html>"
        result = parse_from_load_data(html)

        assert result is not None
        assert result.title == "FIST 2026 Availability"
        assert len(result.sections) == 1
        assert result.sections[0].section_title == "When are you available?"
        assert result.sections[0].options == [
            "Saturday, June 14, 7:00 PM",
            "Sunday, June 15, 2:00 PM",
            "Saturday, June 21, 7:00 PM",
        ]

    def test_skips_non_checkbox_questions(self):
        form_data = [
            None,
            [
                None,
                [
                    [
                        None,
                        "What is your name?",
                        None,
                        0,
                        [[None, None]],
                    ],
                ],
                None, None, None, None, None, None,
                "Test Form",
            ],
        ]
        html = f"<html><script>var FB_PUBLIC_LOAD_DATA_ = {json.dumps(form_data)};</script></html>"
        result = parse_from_load_data(html)
        assert len(result.sections) == 0


class TestParseFromHtml:
    def test_extracts_title_from_og_title(self):
        html = '<html><head><meta property="og:title" content="My Form"></head><body></body></html>'
        result = parse_from_html(html)
        assert result.title == "My Form"

    def test_falls_back_to_page_title(self):
        html = "<html><head><title>Cool Form - Google Forms</title></head><body></body></html>"
        result = parse_from_html(html)
        assert result.title == "Cool Form"

    def test_extracts_options_from_data_answer_value(self):
        html = """
            <html><body>
                <div role="group">
                    <div data-answer-value="Option A"></div>
                    <div data-answer-value="Option B"></div>
                </div>
            </body></html>
        """
        result = parse_from_html(html)
        assert len(result.sections) == 1
        assert result.sections[0].options == ["Option A", "Option B"]

    def test_returns_empty_sections_when_no_structure(self):
        html = "<html><body><p>Just some text</p></body></html>"
        result = parse_from_html(html)
        assert len(result.sections) == 0


class TestFilterDateSections:
    def test_keeps_sections_with_date_options(self):
        sections = [
            FormSection(
                section_title="Weekend 1",
                options=["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"],
            ),
        ]
        result = filter_date_sections(sections)
        assert len(result) == 1
        assert result[0].options == ["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"]

    def test_removes_non_date_sections(self):
        sections = [
            FormSection(
                section_title="What kind of group?",
                options=["WIT company ensemble", "On-going indie team"],
            ),
            FormSection(
                section_title="Weekend 1",
                options=["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"],
            ),
        ]
        result = filter_date_sections(sections)
        assert len(result) == 1
        assert result[0].section_title == "Weekend 1"

    def test_strips_empty_and_non_date_options(self):
        sections = [
            FormSection(
                section_title="Weekend 1",
                options=["FRI 3/13 at 7:30PM", "Not Available This Weekend", ""],
            ),
        ]
        result = filter_date_sections(sections)
        assert result[0].options == ["FRI 3/13 at 7:30PM"]


class TestExtractFormData:
    def test_prefers_load_data_over_html(self):
        form_data = [
            None,
            [
                None,
                [
                    [None, "Dates", None, 4, [[None, [["Sat June 14"]]]]],
                ],
                None, None, None, None, None, None,
                "From Load Data",
            ],
        ]
        html = f"""
            <html>
            <head><meta property="og:title" content="From HTML"></head>
            <body>
                <script>var FB_PUBLIC_LOAD_DATA_ = {json.dumps(form_data)};</script>
                <div role="group"><div data-answer-value="FRI 3/13 at 7:30PM"></div></div>
            </body>
            </html>
        """
        result = extract_form_data(html)
        assert result.title == "From Load Data"
        assert result.sections[0].options == ["Sat June 14"]

    def test_falls_back_to_html(self):
        html = """
            <html>
            <head><meta property="og:title" content="HTML Form"></head>
            <body>
                <div role="group"><div data-answer-value="FRI 3/13 at 7:30PM"></div></div>
            </body>
            </html>
        """
        result = extract_form_data(html)
        assert result.title == "HTML Form"
        assert result.sections[0].options == ["FRI 3/13 at 7:30PM"]

    def test_filters_non_date_sections(self):
        form_data = [
            None,
            [
                None,
                [
                    [None, "What kind of group?", None, 4, [[None, [["Ensemble"], ["Indie team"]]]]],
                    [None, "Weekend 1", None, 4, [[None, [["FRI 3/13 at 7:30PM"], ["SAT 3/14 at 3:00PM"], ["Not Available This Weekend"], [""]]]]]
                ],
                None, None, None, None, None, None,
                "FIST 2026",
            ],
        ]
        html = f"<html><script>var FB_PUBLIC_LOAD_DATA_ = {json.dumps(form_data)};</script></html>"
        result = extract_form_data(html)
        assert len(result.sections) == 1
        assert result.sections[0].section_title == "Weekend 1"
        assert result.sections[0].options == ["FRI 3/13 at 7:30PM", "SAT 3/14 at 3:00PM"]
