#!/usr/bin/env bash
# Runs when a Codespace is handed to a student, including one started from a
# prebuild. Keep it fast: anything slow belongs in onCreate.sh.
cat <<'MSG'

Ready.

  notebooks/tutorial-1.ipynb … tutorial-5.ipynb   Python
  r/tutorial-1.R … tutorial-5.R                   R

Open a starter file, work out each answer, then check it at
https://chris-r-uol.github.io/stats_learning/

To preview the website inside this Codespace:  python3 -m http.server 8791
MSG
