"""
Generate the tutorial datasets.

The Word document quotes summary statistics for four datasets but the data file
itself was never in the project.  Rather than invent numbers and let the
published answers drift, each dataset here is *searched for* under the exact
constraints the document states, so every worked answer in the tutorials
remains true.

Run:  python tools/generate_data.py
Then: python tools/verify_answers.py   (proves the constraints actually hold)

Output is written to data/csv/ as CSV.  build_workbooks.py turns those into the
student-facing .xlsx.
"""

from __future__ import annotations

import csv
import math
import random
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "data" / "csv"

# The document's numbers are Excel's, so we must match Excel's definitions:
# STDEV.S / VAR.S use the n-1 divisor, SKEW uses the adjusted Fisher-Pearson
# coefficient, and QUARTILE.INC interpolates on position 1+q(n-1).


def var_s(x: np.ndarray) -> float:
    return float(np.var(x, ddof=1))


def stdev_s(x: np.ndarray) -> float:
    return float(np.std(x, ddof=1))


def skew_excel(x: np.ndarray) -> float:
    """Excel's SKEW: n/((n-1)(n-2)) * sum(((xi - mean)/s)**3)."""
    n = len(x)
    s = stdev_s(x)
    if s == 0:
        return 0.0
    z = (x - x.mean()) / s
    return float(n / ((n - 1) * (n - 2)) * np.sum(z**3))


def quartile_inc(x: np.ndarray, q: float) -> float:
    """Excel's QUARTILE.INC / PERCENTILE.INC -- linear interpolation on
    position 1 + q*(n-1).  This is numpy's default 'linear' method."""
    return float(np.percentile(np.sort(x), q * 100, method="linear"))


# ---------------------------------------------------------------------------
# Tutorial 1 -- car travel time survey
# ---------------------------------------------------------------------------
#
# Constraints, all taken from the document:
#   n = 55, integer minutes
#   histogram counts on width-5 bins (0,5] .. (60,65]:
#       0, 0, 16, 16, 4, 5, 7, 4, 2, 0, 0, 0, 1
#   mean 22.58, median 19, mode 12 (unique)
#   VAR.S 113.99, SKEW 1.20
#   QUARTILE.INC 1/2/3 = 14.5, 19, 30.5
#   exactly one outlier, value 61
#
# The bin counts fix how many values fall in each range, which in turn fixes
# where the quartile interpolation positions land:
#   Q1 at position 14.5 -> between the 14th and 15th values (both in 11..15),
#      so those must be 14 and 15.
#   median at position 28 -> the 12th value of the 16..20 group must be 19.
#   Q3 at position 41.5 -> between the 41st (last of 26..30) and 42nd (first
#      of 31..35), so those must be 30 and 31.
# Mean 22.58 pins the total to 1242 (1242/55 = 22.5818 -> 22.58).
#
# Note on VAR.S vs STDEV.S: the document reports 113.99 and 10.67, but
# sqrt(113.99) = 10.6766, which displays as 10.68.  We treat the variance as
# authoritative (it carries more significant figures) and accept both 10.67 and
# 10.68 in the tutorial.  See ERRATA.md item 6.

TRAVEL_BINS = [(0, 5), (5, 10), (10, 15), (15, 20), (20, 25), (25, 30),
               (30, 35), (35, 40), (40, 45), (45, 50), (50, 55), (55, 60), (60, 65)]
TRAVEL_COUNTS = [0, 0, 16, 16, 4, 5, 7, 4, 2, 0, 0, 0, 1]

TRAVEL_TARGET = dict(total=1242, var=113.99, skew=1.20, skew_without=0.69)


def _travel_penalty(groups: dict[tuple[int, int], list[int]]) -> float:
    x = np.array([v for g in groups.values() for v in g], dtype=float)
    p = 0.0
    p += abs(x.sum() - TRAVEL_TARGET["total"]) * 12.0
    p += abs(var_s(x) - TRAVEL_TARGET["var"]) * 4.0
    p += abs(skew_excel(x) - TRAVEL_TARGET["skew"]) * 220.0
    # Question 6 removes the single outlier and republishes every statistic.
    # Mean, variance and sd for the reduced set follow arithmetically from the
    # full-set values, but the skew does not, so it is targeted explicitly.
    y = np.sort(x)[:-1]
    p += abs(skew_excel(y) - TRAVEL_TARGET["skew_without"]) * 180.0
    # unique mode of 12
    counts = np.bincount(x.astype(int))
    twelves = counts[12]
    rival = counts.copy()
    rival[12] = 0
    p += max(0, rival.max() - twelves + 1) * 25.0
    return p


def generate_travel_times(seed: int = 0) -> list[int]:
    rng = random.Random(seed)

    # (lo, hi] bins that actually carry values, with their fixed counts
    live = [(lo, hi, n) for (lo, hi), n in zip(TRAVEL_BINS, TRAVEL_COUNTS) if n]

    # Positions inside a group that are pinned by the quartile/median constraints.
    # group -> {index within sorted group: required value}
    # Positions pinned by the quartile and median constraints, for both the
    # full set (Q2) and the set with the outlier removed (Q6).
    pinned = {
        (10, 15): {13: 14, 14: 15},   # 14th, 15th overall -> Q1 = 14.5 (and 14.25 without)
        (15, 20): {10: 18, 11: 19},   # 27th, 28th overall -> median 19, and 18.5 without
        (25, 30): {3: 30, 4: 30},     # 40th, 41st overall -> Q3 30.5 full, 30.0 without
        (30, 35): {0: 31},            # 42nd overall       -> Q3 upper side
    }

    def fresh() -> dict[tuple[int, int], list[int]]:
        g = {}
        for lo, hi, n in live:
            vals = sorted(rng.randint(lo + 1, hi) for _ in range(n))
            g[(lo, hi)] = vals
        return _apply_pins(g)

    def _apply_pins(g):
        for key, pins in pinned.items():
            if key not in g:
                continue
            vals = sorted(g[key])
            for idx, want in pins.items():
                vals[idx] = want
            g[key] = sorted(vals)
        return g

    best, best_p = None, float("inf")

    for restart in range(400):
        groups = fresh()
        p = _travel_penalty(groups)
        temp = 3.0
        for step in range(9000):
            temp = max(0.02, 3.0 * (1 - step / 9000))
            lo, hi, n = live[rng.randrange(len(live))]
            key = (lo, hi)
            if n == 0:
                continue
            vals = list(groups[key])
            idx = rng.randrange(n)
            if idx in pinned.get(key, {}):
                continue
            old = vals[idx]
            vals[idx] = rng.randint(lo + 1, hi)
            vals.sort()
            trial = dict(groups)
            trial[key] = vals
            trial = _apply_pins(trial)
            q = _travel_penalty(trial)
            if q < p or rng.random() < math.exp((p - q) / temp):
                groups, p = trial, q
            if p == 0:
                break
        if p < best_p:
            best, best_p = groups, p
        if best_p == 0:
            break

    x = sorted(v for g in best.values() for v in g)
    return x


# ---------------------------------------------------------------------------
# Fitting a sample to an exact mean and standard deviation
# ---------------------------------------------------------------------------
#
# Rejection sampling cannot hit two moments at once in reasonable time, so we
# work in integer units (hundredths of a litre, tenths of a second) and run a
# greedy local search: repeatedly nudge whichever single value most reduces the
# combined mean/sd error.  Integer units matter -- they guarantee the value the
# student sees in the cell is exactly the value we computed the statistics
# from, with no float display drift.


def _fit_mean_sd(rng, n, target_mean, target_sd, scale, lo, hi, tol=0.002,
                 restarts=60, iters=60_000):
    """Return n integers (in units of 1/scale) whose mean and sample sd match
    the targets to within `tol` once divided by `scale`."""
    tm = target_mean * scale
    ts = target_sd * scale

    def err(v):
        m = v.mean()
        s = np.std(v, ddof=1)
        return abs(m - tm) / scale, abs(s - ts) / scale

    best, best_score = None, float("inf")
    for _ in range(restarts):
        v = np.round(rng.normal(tm, ts, n)).astype(np.int64)
        v = np.clip(v, lo * scale, hi * scale)
        for _ in range(iters):
            em, es = err(v)
            score = em + es
            if em < tol and es < tol:
                return v
            if score < best_score:
                best, best_score = v.copy(), score
            # push the mean first, then the spread
            i = rng.integers(n)
            step = max(1, int(score * scale * 0.5))
            direction = 0
            if em >= tol:
                direction = 1 if v.mean() < tm else -1
            else:
                # adjust spread: move an extreme value in or out
                far = v[i] - v.mean()
                grow = np.std(v, ddof=1) < ts
                direction = int(np.sign(far)) * (1 if grow else -1)
                if direction == 0:
                    direction = 1
            cand = v.copy()
            new = cand[i] + direction * rng.integers(1, step + 1)
            new = int(np.clip(new, lo * scale, hi * scale))
            if new == cand[i]:
                continue
            cand[i] = new
            cm, cs = err(cand)
            if cm + cs < score:
                v = cand
    raise RuntimeError(f"could not fit mean={target_mean} sd={target_sd}; "
                       f"best error {best_score:.5f}")


# ---------------------------------------------------------------------------
# Tutorial 3 -- fuel consumption (n=27, sample mean 10.08, population sd known 1.3)
# ---------------------------------------------------------------------------
#
# Only the mean is quoted in the solutions; the population sd of 1.3 is given
# in the question and is a property of the population, not of this sample.  We
# still make the sample sd land near 1.3 so the data looks credible and so a
# student who computes STDEV.S doesn't see something wildly inconsistent.

def generate_fuel(seed: int = 11) -> list[float]:
    rng = np.random.default_rng(seed)
    v = _fit_mean_sd(rng, 27, 10.08, 1.28, scale=100, lo=6, hi=15)
    return [round(int(u) / 100, 2) for u in v]


# ---------------------------------------------------------------------------
# Tutorial 3 -- HGV weights (n=38, sample mean 22.29, sample sd 7.59, tonnes)
# ---------------------------------------------------------------------------

def generate_hgv(seed: int = 5) -> list[float]:
    rng = np.random.default_rng(seed)
    v = _fit_mean_sd(rng, 38, 22.29, 7.59, scale=100, lo=4, hi=44)
    return [round(int(u) / 100, 2) for u in v]


# ---------------------------------------------------------------------------
# Tutorial 4 -- junction waiting times, paired before/after (n=30)
#   mean difference (after - before) = -8.4 s, sd of differences = 4.99 s
# ---------------------------------------------------------------------------
#
# The differences carry the constraints, so we fit those first and then choose
# a plausible 'before' series.  Everything stays in tenths of a second so that
# after - before is exact -- a student subtracting the two columns in Excel
# must get precisely the differences we fitted.

def generate_junction(seed: int = 23) -> tuple[list[float], list[float]]:
    rng = np.random.default_rng(seed)
    d = _fit_mean_sd(rng, 30, -8.4, 4.99, scale=10, lo=-25, hi=8)
    for _ in range(20_000):
        before = np.round(rng.normal(64, 9, 30), 1)
        before_t = np.round(before * 10).astype(np.int64)
        after_t = before_t + d
        if after_t.min() > 250 and before_t.min() > 300:
            return ([round(int(b) / 10, 1) for b in before_t],
                    [round(int(a) / 10, 1) for a in after_t])
    raise RuntimeError("junction waiting time search failed")


# ---------------------------------------------------------------------------

def write_csv(name: str, header: list[str], rows: list[list]) -> None:
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    with open(CSV_DIR / name, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote data/csv/{name}  ({len(rows)} rows)")


def main() -> None:
    print("Generating datasets...")

    travel = generate_travel_times()
    x = np.array(travel, dtype=float)
    print(f"  travel times: n={len(x)} mean={x.mean():.4f} median={np.median(x):.1f} "
          f"var={var_s(x):.4f} sd={stdev_s(x):.4f} skew={skew_excel(x):.4f} "
          f"Q1={quartile_inc(x,.25)} Q3={quartile_inc(x,.75)}")
    write_csv("travel-times.csv", ["observation", "travel_time_min"],
              [[i + 1, v] for i, v in enumerate(travel)])

    fuel = generate_fuel()
    f = np.array(fuel)
    print(f"  fuel: n={len(f)} mean={f.mean():.4f} sd={stdev_s(f):.4f}")
    write_csv("fuel-consumption.csv", ["vehicle", "fuel_l_per_100km"],
              [[i + 1, v] for i, v in enumerate(fuel)])

    hgv = generate_hgv()
    h = np.array(hgv)
    print(f"  hgv: n={len(h)} mean={h.mean():.4f} sd={stdev_s(h):.4f}")
    write_csv("hgv-weights.csv", ["vehicle", "weight_tonnes"],
              [[i + 1, v] for i, v in enumerate(hgv)])

    before, after = generate_junction()
    d = np.array(after) - np.array(before)
    print(f"  junction: n={len(before)} mean_diff={d.mean():.4f} sd_diff={stdev_s(d):.4f}")
    write_csv("junction-waiting.csv", ["observation", "before_s", "after_s"],
              [[i + 1, b, a] for i, (b, a) in enumerate(zip(before, after))])

    # Tutorial 5 data is given in full in the document -- no search needed.
    write_csv("reaction-distance.csv",
              ["site", "warning_distance_m", "reaction_distance_m"],
              [[1, 50, 41.54], [2, 100, 47.66], [3, 80, 53.25], [4, 125, 58.86],
               [5, 200, 59.31], [6, 400, 91.31], [7, 300, 92.90], [8, 240, 86.10],
               [9, 180, 60.18], [10, 260, 88.00]])

    write_csv("car-ownership.csv", ["status", "has_car", "no_car"],
              [["Employed", 130, 21], ["Unemployed", 21, 34], ["Homemaker", 54, 50],
               ["Student", 31, 120], ["Retired", 31, 53], ["Disability", 11, 13]])

    write_csv("accidents-weather.csv", ["city", "dry", "wet", "snow", "ice"],
              [["Leeds", 115, 174, 32, 6], ["Manchester", 68, 71, 17, 7]])

    write_csv("taxi-queue.csv", ["number_in_queue", "frequency"],
              [[1, 6], [2, 4], [3, 5], [4, 2], [5, 2], [6, 1]])

    print("Done.")


if __name__ == "__main__":
    main()
