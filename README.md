# Transport Statistics Tutorials

Interactive practice for the statistics tutorials in the Transport Data
Collection and Analysis module. A student works a question in Excel, types the
answer, and finds out immediately whether it is right — and if not, **which
specific mistake they made**.

Formative only. No marks, no accounts, no server.

**Live site:** enable GitHub Pages on this repository (Settings → Pages →
Source: GitHub Actions) and it will publish on the next push to `main`.

---

## What's here

```
index.html            landing page
tutorial.html         renders any tutorial: ?t=1 … ?t=5
methodology.html      the three problem-solving methods
reference.html        Excel/R/Python function index and the tail-direction traps

content/              the questions, as YAML — this is what you edit
assets/               css, js, generated SVG figures, vendored libraries
data/                 datasets as .xlsx and .csv
workbooks/            the Hypothesis Test Workbench
tools/                data generation, workbook building, answer verification
ERRATA.md             every difference from the original Word handout
```

---

## The pedagogy, briefly

**Wrong answers are the product.** Each numeric question carries a list of
*traps* — the specific wrong values this material provokes. Enter 10.58 for a
standard deviation and the site does not say "incorrect", it says: *that is
`STDEV.P`, the population formula; this is a survey, so use `STDEV.S`.*

Every trap comes from the handout's own narrative or from a mistake the
arithmetic makes easy: `STDEV.P` for `STDEV.S`, forgetting to invert
P(X > c) = 1 − P(X ≤ c), off-by-one on discrete cumulative bounds, using `s`
where `s/√n` is needed, α instead of α/2, `T.INV` instead of `T.INV.2T`, χ²
degrees of freedom, not pooling expected cells below 5.

**Questions are decomposed into steps.** Rather than one box for a final
number, a question walks through choosing the function, computing the value, and
interpreting it. This is what makes hypothesis testing tractable: H₀/H₁ → tails
→ α → statistic → critical value → p-value → decision → interpretation, each
checked separately.

**Both routes, every time.** Every hypothesis test asks for the critical value
*and* the p-value. They always agree, so a disagreement means the student has
found their own mistake.

**Decisions require a reason.** "Reject H₀" alone is not enough — the student
also picks *why*, which catches the right answer reached from the wrong
comparison.

**Some things cannot be auto-marked, and are not faked.** Sketching and
"comment on your results" steps present a model answer next to a short rubric
and are recorded as self-assessed, not correct.

---

## Answer visibility

Answers live in the YAML and can be read by anyone who opens developer tools.
This is deliberate, not an oversight:

- Tolerance checking and trap detection need the plaintext values. Hashing would
  break both.
- The full worked solutions are already handed out in the Word document.
- It is not assessed, so there is nothing to game.

What creates the learning is **progressive disclosure**: hint → stronger hint →
worked solution, unlocked after two attempts or on request.

## Privacy

Progress is written to `localStorage` and never leaves the browser. There is no
backend, no analytics, and no accounts — so there is no personal data to
protect and nothing requiring ethics or data-protection sign-off. Clearing site
data clears progress; the site says so where a student will see it.

---

## Working on it

### Editing a question

`content/tutorial-N.yml`. No build step and no toolchain — edit it in GitHub's
web editor and it is live as soon as Pages redeploys. See
[CONTRIBUTING-CONTENT.md](CONTRIBUTING-CONTENT.md) for the full step format.

### Running it locally

```bash
python3 -m http.server 8791
```

Then open <http://localhost:8791>. It must be served over HTTP — opening
`tutorial.html` from the filesystem will fail, because the browser blocks the
`fetch` of the YAML.

### Regenerating data and workbooks

```bash
python3 -m venv .venv && .venv/bin/pip install numpy scipy openpyxl pyyaml
.venv/bin/python tools/generate_data.py      # ~70s, deterministic
.venv/bin/python tools/build_workbooks.py
.venv/bin/python tools/make_figures.py
```

`generate_data.py` searches for datasets satisfying the statistics the handout
publishes — see [ERRATA.md](ERRATA.md#the-datasets). It is seeded, so it
produces the same data every time.

### Verifying the answers

```bash
.venv/bin/python tools/verify_answers.py
```

This is the important one, and it runs in CI on every push. It:

1. recomputes every summary statistic from the shipped data and checks it
   against what the handout publishes;
2. recomputes every standalone answer across all five tutorials with
   numpy/scipy;
3. evaluates the `verify:` expression attached to each question step and checks
   it against the `answer:` stored beside it;
4. lints every Excel formula in the workbooks against a list of real function
   names — which is how `CHI.INV.RT` was caught;
5. schema-checks the YAML: tolerances present, exactly one correct option per
   `choice`, feedback on every distractor, no duplicate ids.

An answer-checking site whose answers are wrong is worse than no site at all,
which is why this gates the build.

Two more checks sit alongside it:

```bash
.venv/bin/python tools/check_workbench.py    # also runs in CI
```

implements enough of Excel's formula language to **evaluate every workbench
sheet** and compare the results against the worked examples. Linting function
names catches `CHI.INV.RT`; this catches a formula pointing at the wrong cell,
which is the worse failure because the sheet returns a plausible number instead
of an error.

And `tests/selfcheck.html` (open it in the browser while serving locally) drives
the real checking logic over all 120 steps: it confirms the correct answer is
accepted and that **every trap and distractor returns its own explanation**
rather than falling through to the generic message. A trap that silently stops
firing is otherwise invisible, since the student still sees a plausible "not
quite".

---

## The Hypothesis Test Workbench

`workbooks/hypothesis-test-workbench.xlsx`

Excel has no function that runs a hypothesis test from summary statistics.
`T.TEST` needs two ranges; so does the Analysis ToolPak. But several questions
give only n, the mean and the standard deviation, so the test has to be built
from cell arithmetic — which is where students get lost.

The workbench has one sheet per test (one-sample z and t, two-sample z and t,
paired t, χ², regression coefficient t). Yellow cells are inputs; everything
else is live. Each sheet shows the critical-value route and the p-value route
side by side with a plain-English verdict, and flags it if they disagree.

Sheets come preloaded with the worked examples from the tutorials, so you can
check the workbook against the handout before trusting it with your own numbers.

---

## Known limitations

- **The workbench has not been opened in Excel itself.** Its formulas are
  parsed and evaluated by `tools/check_workbench.py`, which verifies the cell
  references and the arithmetic, and its function names are linted — but no
  real copy of Excel has rendered the file. Worth opening once to check the
  formatting looks the way you want.
- **The datasets are reconstructions.** They reproduce every published statistic
  but are not the original measurements. Drop the real file in and re-run
  `verify_answers.py` if you find it.
- **Tutorial 1 Question 3** asks for three representative rows of the frequency
  table rather than all thirteen, on the grounds that the site checks
  understanding and the spreadsheet does the data entry. The full table is in
  the worked solution.
