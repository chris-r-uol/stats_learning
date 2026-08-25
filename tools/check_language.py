"""
Check that all student-facing text uses British English.

Scans the tutorial YAML, the HTML pages, the markdown docs and the
user-facing strings in the JavaScript and workbook builder.

Deliberately does NOT scan code: Excel function names (STANDARDIZE), CSS
keywords (color, center), JavaScript API properties (behavior) and Python
module names (math) are American by definition and must stay that way.

Run:  python tools/check_language.py
"""

from __future__ import annotations

import glob
import html
import pathlib
import re
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Keys whose values are code, not prose.
CODE_KEYS = {"excel", "r", "python", "verify", "id", "kind", "key", "csv",
             "sheet", "svg", "precision"}

CODE_FILES = ["assets/js/check.js", "assets/js/engine.js", "assets/js/progress.js",
              "assets/js/chrome.js", "assets/js/home.js", "tools/build_workbooks.py"]
DOC_FILES = ["README.md", "CONTRIBUTING-CONTENT.md", "ERRATA.md"]
HTML_FILES = ["index.html", "tutorial.html", "methodology.html", "reference.html"]

# american -> british.  Only high-confidence pairs; anything ambiguous is left
# out rather than risk a false positive that trains people to ignore this check.
SPELLINGS = {
    "analyze": "analyse", "analyzed": "analysed", "analyzes": "analyses",
    "analyzing": "analysing", "paralyze": "paralyse",
    "organize": "organise", "organized": "organised", "organization": "organisation",
    "summarize": "summarise", "summarized": "summarised", "summarizing": "summarising",
    "recognize": "recognise", "recognized": "recognised",
    "minimize": "minimise", "maximize": "maximise",
    "standardize": "standardise", "visualize": "visualise",
    "visualization": "visualisation", "normalize": "normalise",
    "categorize": "categorise", "categorized": "categorised",
    "emphasize": "emphasise", "emphasized": "emphasised",
    "apologize": "apologise", "utilize": "utilise", "prioritize": "prioritise",
    "customize": "customise", "optimize": "optimise", "realize": "realise",
    "specialize": "specialise", "generalize": "generalise",
    "characterize": "characterise", "criticize": "criticise",
    "memorize": "memorise", "hypothesize": "hypothesise",
    "randomize": "randomise", "penalize": "penalise", "itemize": "itemise",
    "color": "colour", "colors": "colours", "colored": "coloured",
    "behavior": "behaviour", "behaviors": "behaviours",
    "favor": "favour", "favorable": "favourable", "labor": "labour",
    "neighbor": "neighbour", "honor": "honour", "humor": "humour",
    "center": "centre", "centered": "centred", "centers": "centres",
    "meter": "metre", "meters": "metres", "liter": "litre", "liters": "litres",
    "fiber": "fibre", "theater": "theatre",
    "defense": "defence", "offense": "offence", "pretense": "pretence",
    "catalog": "catalogue", "dialog": "dialogue", "analog": "analogue",
    "modeled": "modelled", "modeling": "modelling",
    "labeled": "labelled", "labeling": "labelling",
    "traveled": "travelled", "traveling": "travelling",
    "canceled": "cancelled", "canceling": "cancelling",
    "totaled": "totalled", "signaled": "signalled", "fueled": "fuelled",
    "math": "maths", "gray": "grey", "gotten": "got",
    "aluminum": "aluminium", "airplane": "aeroplane",
    "enrollment": "enrolment", "fulfillment": "fulfilment",
    "installment": "instalment", "skillful": "skilful", "willful": "wilful",
    "fulfill": "fulfil", "enroll": "enrol", "instill": "instil",
    "practicing": "practising", "specialty": "speciality",
    "program": "programme", "programs": "programmes",
    "toward": "towards", "percent": "per cent",
    # transport vocabulary
    "truck": "lorry", "trucks": "lorries", "gas": "petrol",
    "freeway": "motorway", "highway": "motorway", "sidewalk": "pavement",
    "parking lot": "car park", "downtown": "city centre", "elevator": "lift",
    "vacation": "holiday", "trash": "rubbish", "cell phone": "mobile phone",
}

# 'practice' is the noun, 'practise' the verb.  Flag only the American pattern
# of using 'practice' as a verb, which shows up after 'to' or a pronoun.
VERB_PRACTICE = re.compile(r"\b(to|you|we|they|please)\s+practice\b", re.I)
NOUN_PRACTISE = re.compile(r"\b(the|a|this|some|good|daily)\s+practise\b", re.I)


def yaml_prose(obj, out):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in CODE_KEYS:
                continue
            yaml_prose(v, out)
    elif isinstance(obj, list):
        for v in obj:
            yaml_prose(v, out)
    elif isinstance(obj, str):
        out.append(obj)


def collect():
    """Return [(source, text)] of everything a student can read."""
    chunks = []

    for f in sorted(glob.glob(str(ROOT / "content" / "*.yml"))):
        out = []
        yaml_prose(yaml.safe_load(pathlib.Path(f).read_text()), out)
        chunks.append((pathlib.Path(f).name, "\n".join(out)))

    for f in HTML_FILES:
        s = (ROOT / f).read_text()
        s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
        s = re.sub(r"<[^>]+>", " ", s)
        chunks.append((f, html.unescape(s)))

    for f in DOC_FILES:
        chunks.append((f, (ROOT / f).read_text()))

    # Only sentence-like literals from code: four or more words, so that
    # identifiers such as "center" or "smooth" are never picked up.
    for f in CODE_FILES:
        s = (ROOT / f).read_text()
        lits = re.findall(r"'([^'\n]*)'", s) + re.findall(r'"([^"\n]*)"', s)
        lits = [t for t in lits if len(t.split()) >= 4]
        chunks.append((f, "\n".join(lits)))

    return chunks


def scrub(text: str) -> str:
    """Remove things that are code even inside prose.

    Fenced blocks must go first.  Stripping inline spans first would pair a
    backtick from inside a fence with one outside it, and everything after
    that point would be mis-paired.
    """
    text = re.sub(r"```.*?```", " ", text, flags=re.S)      # fenced blocks
    text = re.sub(r"`[^`\n]*`", " ", text)                  # inline code spans
    text = re.sub(r"\b[A-Z][A-Z0-9._]{2,}\b", " ", text)     # STANDARDIZE etc
    text = re.sub(r"\b\w+\.\w+\b", " ", text)              # math.sqrt, df.mean
    return text


def main() -> int:
    problems = []
    words_checked = 0

    for source, text in collect():
        clean = scrub(text)
        words_checked += len(clean.split())
        low = clean.lower()

        for us, uk in SPELLINGS.items():
            for m in re.finditer(r"\b" + re.escape(us) + r"\b", low):
                start = max(0, m.start() - 40)
                context = " ".join(clean[start:m.end() + 40].split())
                problems.append(f"{source}: '{us}' should be '{uk}'\n      …{context}…")

        for m in VERB_PRACTICE.finditer(clean):
            problems.append(f"{source}: 'practice' used as a verb; the British "
                            f"verb is 'practise'\n      …{m.group(0)}…")
        for m in NOUN_PRACTISE.finditer(clean):
            problems.append(f"{source}: 'practise' used as a noun; the British "
                            f"noun is 'practice'\n      …{m.group(0)}…")

    print("British English check")
    print("-" * 21)
    print(f"  {words_checked} words of student-facing text checked")
    print(f"  {len(SPELLINGS)} spellings and the practice/practise rule applied")

    if problems:
        print(f"\nFAILED -- {len(problems)} problems:\n")
        for p in problems:
            print(f"  x {p}")
        return 1
    print("\nAll student-facing text is British English.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
