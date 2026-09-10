"""
Build the Python notebooks and R scripts students work in.

Generated from content/tutorial-*.yml so the questions can never drift from
the website. Answers are deliberately NOT included: the questions are here,
the checking stays on the site.

Run:  python tools/build_starters.py
      python tools/build_starters.py --check     # CI: are the files current?
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import textwrap

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = "https://chris-r-uol.github.io/stats_learning"

# Steps that need somewhere to write code. The rest are conceptual, so the
# starter states the question and leaves the answering to the website.
COMPUTATIONAL = {"numeric", "interval", "table", "formula"}


def plain(md: str) -> str:
    """Markdown to plain text, for R comments."""
    t = md or ""
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)          # images
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)      # links
    t = re.sub(r"\*\*([^*]*)\*\*", r"\1", t)            # bold
    t = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"\1", t)   # italic
    t = re.sub(r"`([^`]*)`", r"\1", t)                  # code spans
    t = re.sub(r"^\s*\|.*$", "", t, flags=re.M)         # table rows
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")


def wrap_comment(text: str, prefix: str = "# ") -> list[str]:
    """Wrap prose into R comments, keeping list items on their own lines.

    Joining a markdown list into one paragraph makes it unreadable, so each
    item is wrapped separately with a hanging indent.
    """
    out = []
    for block in plain(text).split("\n\n"):
        lines = [l for l in block.split("\n") if l.strip()]
        if not lines:
            continue
        if any(LIST_ITEM.match(l) for l in lines):
            # Re-join continuation lines onto their item, then wrap each item.
            items, cur = [], ""
            for l in lines:
                if LIST_ITEM.match(l):
                    if cur:
                        items.append(cur)
                    cur = l.strip()
                else:
                    cur = f"{cur} {l.strip()}".strip()
            if cur:
                items.append(cur)
            for item in items:
                out += textwrap.wrap(item, 74, initial_indent=prefix,
                                     subsequent_indent=prefix + "  ")
        else:
            para = " ".join(block.split())
            out += textwrap.wrap(para, 74, initial_indent=prefix,
                                 subsequent_indent=prefix)
        out.append(prefix.rstrip())
    return out[:-1] if out else []


def notebook_md(text: str) -> str:
    """Keep the markdown, but repoint links so they work from notebooks/."""
    t = text or ""
    t = re.sub(r"\]\(assets/", "](../assets/", t)
    t = re.sub(r"\]\(workbooks/", f"]({SITE}/workbooks/", t)
    t = re.sub(r"\]\((tutorial|reference|methodology|index)\.html",
               rf"]({SITE}/\1.html", t)
    return t.strip()


def var_name(dataset: dict) -> str:
    return re.sub(r"[^a-z0-9]+", "_", dataset["id"].lower()).strip("_")


# ---------------------------------------------------------------- notebooks

def md_cell(cid: str, text: str) -> dict:
    return {"cell_type": "markdown", "id": cid, "metadata": {},
            "source": text.rstrip().split("\n")}


def code_cell(cid: str, text: str) -> dict:
    return {"cell_type": "code", "id": cid, "metadata": {},
            "execution_count": None, "outputs": [],
            "source": text.rstrip().split("\n") if text else [""]}


def python_loader(datasets: list[dict]) -> str:
    lines = [
        "import numpy as np",
        "import pandas as pd",
        "import matplotlib.pyplot as plt",
        "from scipy import stats",
        "from pathlib import Path",
        "",
        "# Find data/csv from wherever this notebook is run.",
        'DATA = next(p / "data" / "csv" for p in [Path.cwd(), *Path.cwd().parents]',
        '            if (p / "data" / "csv").is_dir())',
    ]
    if datasets:
        lines.append("")
        for d in datasets:
            lines.append(f'{var_name(d)} = pd.read_csv(DATA / "{d["csv"]}")')
        lines.append("")
        lines.append(f"{var_name(datasets[0])}.head()")
    return "\n".join(lines)


def build_notebook(doc: dict) -> dict:
    n = doc["tutorial"]
    cells = [md_cell(f"t{n}-title", "\n".join([
        f"# Tutorial {n} — {doc['title']}",
        "",
        notebook_md(doc.get("intro", "")),
        "",
        f"Questions and answer checking: {SITE}/tutorial.html?t={n}",
        "",
        "This file gives you the questions and the data. Work out each answer",
        "here, then enter it on the website to check it.",
    ]))]

    if doc.get("supplementary"):
        cells.append(md_cell(f"t{n}-supp",
                             "## Before you start\n\n" +
                             notebook_md(doc["supplementary"])))

    datasets = doc.get("datasets", [])
    cells.append(md_cell(f"t{n}-setup-md", "## Setup"))
    cells.append(code_cell(f"t{n}-setup", python_loader(datasets)))

    for q in doc.get("questions", []):
        head = [f"## {q.get('title', q['id'])}", ""]
        if q.get("prompt"):
            head.append(notebook_md(q["prompt"]))
        head += ["", f"[Check your answers]({SITE}/tutorial.html?t={n}#{q['id']})"]
        cells.append(md_cell(f"{q['id']}-md", "\n".join(head)))

        for i, step in enumerate(q.get("steps", [])):
            ask = notebook_md(step.get("ask", "")) or f"Step {i + 1}"
            unit = f" ({step['unit']})" if step.get("unit") else ""
            cells.append(md_cell(f"{q['id']}-s{i}-md", f"**{i + 1}.** {ask}{unit}"))
            if step.get("kind") in COMPUTATIONAL:
                cells.append(code_cell(f"{q['id']}-s{i}", ""))

    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python",
                           "name": "python3"},
            "language_info": {"name": "python", "file_extension": ".py",
                              "mimetype": "text/x-python", "version": "3.11"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


# ----------------------------------------------------------------- R scripts

def r_loader(datasets: list[dict]) -> list[str]:
    lines = [
        "# Find data/csv from wherever this script is run.",
        "find_data <- function() {",
        "  d <- normalizePath(getwd())",
        '  while (!dir.exists(file.path(d, "data", "csv")) && dirname(d) != d) {',
        "    d <- dirname(d)",
        "  }",
        '  file.path(d, "data", "csv")',
        "}",
        "DATA <- find_data()",
    ]
    if datasets:
        lines.append("")
        for d in datasets:
            lines.append(f'{var_name(d)} <- read.csv(file.path(DATA, "{d["csv"]}"))')
        lines.append("")
        lines.append(f"head({var_name(datasets[0])})")
    return lines


def build_r(doc: dict) -> str:
    n = doc["tutorial"]
    out = [
        "# " + "=" * 74,
        f"# Tutorial {n} — {doc['title']}",
        "# " + "=" * 74,
        "#",
    ]
    out += wrap_comment(doc.get("intro", ""))
    out += [
        "#",
        f"# Questions and answer checking:",
        f"#   {SITE}/tutorial.html?t={n}",
        "#",
        "# This file gives you the questions and the data. Work out each answer",
        "# here, then enter it on the website to check it.",
        "#",
        "# The method tables and figures for this tutorial (for example the case",
        "# table, or the list of which test to use) are on the website page above.",
        "",
        "",
    ]
    out += r_loader(doc.get("datasets", []))
    out.append("")

    for q in doc.get("questions", []):
        out += ["", "# " + "-" * 74, f"# {q.get('title', q['id'])}", "# " + "-" * 74]
        if q.get("prompt"):
            out.append("#")
            out += wrap_comment(q["prompt"])
        out.append("")

        for i, step in enumerate(q.get("steps", [])):
            ask = plain(step.get("ask", "")) or f"Step {i + 1}"
            unit = f" ({step['unit']})" if step.get("unit") else ""
            out += wrap_comment(f"{i + 1}. {ask}{unit}")
            out.append("")
            if step.get("kind") in COMPUTATIONAL:
                out.append("")
    return "\n".join(out).rstrip() + "\n"


# ---------------------------------------------------------------------------

def targets():
    for f in sorted((ROOT / "content").glob("tutorial-*.yml")):
        doc = yaml.safe_load(f.read_text())
        n = doc["tutorial"]
        yield (ROOT / "notebooks" / f"tutorial-{n}.ipynb",
               json.dumps(build_notebook(doc), indent=1) + "\n")
        yield (ROOT / "r" / f"tutorial-{n}.R", build_r(doc))


def main() -> int:
    check = "--check" in sys.argv
    problems, written = [], 0

    for path, content in targets():
        rel = path.relative_to(ROOT)
        if check:
            if not path.exists():
                problems.append(f"{rel} is missing")
            elif path.read_text() != content:
                problems.append(f"{rel} is out of date")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            written += 1
            print(f"  wrote {rel}")

    if check:
        print("Checking the starter files against the tutorial content...")
        if problems:
            print("\nOut of date:\n")
            for p in problems:
                print(f"  x {p}")
            print("\nRun 'python tools/build_starters.py' and commit the result.")
            return 1
        print("  all starter files are current")
        return 0

    print(f"Done. {written} files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
