#!/usr/bin/env bash
# Runs once, after the container is created.
#
# Nothing here fails the build. A student with working Python but a missing R
# package can still do most of the material, and the summary at the end says
# plainly what is usable and what is not.
set -uo pipefail

echo "==> Python packages"
python3 -m pip install --no-cache-dir --upgrade pip
python3 -m pip install --no-cache-dir -r .devcontainer/requirements.txt

echo
echo "==> R packages"
# Install from CRAN, not apt.
#
# Ubuntu's r-cran-* packages are built against the R that ships with the
# distribution (4.1 on jammy), but this container gets R 4.6 from CRAN. Mixing
# them produces an ABI mismatch: e1071 installs, then fails at load time with
# "undefined symbol: Rf_NonNullStringMatch" from its compiled proxy dependency.
# Building from source against the R that is actually installed avoids that.
#
# e1071 provides skewness() matching Excel's SKEW.
# BSDA provides tsum.test(), the only way to run a t-test from summary
# statistics in R, which Tutorial 4 needs.
Rscript -e 'options(Ncpus = max(1L, parallel::detectCores()))
  need <- c("e1071", "BSDA")
  miss <- need[!vapply(need, requireNamespace, logical(1), quietly = TRUE)]
  if (length(miss)) {
    install.packages(miss, repos = "https://cloud.r-project.org")
  }' || true

echo
echo "==> Environment"
python3 - <<'PY'
import importlib
for m in ["numpy", "scipy", "pandas", "matplotlib", "openpyxl"]:
    try:
        print(f"    python  {m:12s} {importlib.import_module(m).__version__}")
    except Exception as exc:
        print(f"    python  {m:12s} UNUSABLE ({exc})")
PY
# Load each package rather than reading its version number. A package can be
# present and still fail to load, which is exactly what the ABI mismatch did.
Rscript -e 'cat(sprintf("    R       %-12s %s\n", "base", getRversion()))
  for (p in c("e1071", "BSDA")) {
    ok <- tryCatch({ suppressMessages(library(p, character.only = TRUE)); TRUE },
                   error = function(e) FALSE)
    v <- if (ok) as.character(packageVersion(p)) else "UNUSABLE"
    cat(sprintf("    R       %-12s %s\n", p, v))
  }
  cat(sprintf("    R       %-12s %s\n", "skewness()",
      tryCatch(sprintf("%.4f", e1071::skewness(c(1,2,2,3,9), type = 2)),
               error = function(e) "UNUSABLE")))' || true

cat <<'MSG'

Ready.

  notebooks/tutorial-1.ipynb … tutorial-5.ipynb   Python
  r/tutorial-1.R … tutorial-5.R                   R

Open a starter file, work out each answer, then check it at
https://chris-r-uol.github.io/stats_learning/

To preview the website inside this Codespace:  python3 -m http.server 8791
MSG
