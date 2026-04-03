import pathlib

import modal

app = modal.App("wit-form-filler")

modal_dir = pathlib.Path(__file__).parent

image = (
    modal.Image.debian_slim(python_version="3.13")
    .pip_install("httpx", "beautifulsoup4", "fastapi[standard]")
    .add_local_dir(modal_dir / "lib", remote_path="/root/lib")
)


@app.function(image=image, timeout=30)
@modal.fastapi_endpoint(method="POST")
def parse_google_form(data: dict) -> dict:
    import httpx

    from lib.extract_form_data import extract_form_data

    response = httpx.get(data["formUrl"], timeout=15)
    response.raise_for_status()
    return extract_form_data(response.text).to_dict()
