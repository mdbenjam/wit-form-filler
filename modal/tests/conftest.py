import sys
from pathlib import Path

# Add the modal/ directory to sys.path so we can import lib.extract_form_data
# without conflicting with the `modal` pip package.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
