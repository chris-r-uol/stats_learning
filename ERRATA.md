# Errata

Differences between the original Word handout
(`Transport Data Collection and Analysis Statistics_v03docx.docx`) and this
site. Every entry was found by recomputing the handout's own numbers from its
own data; the checks live in `tools/verify_answers.py` and run in CI, so these
claims are re-tested on every push.

They are ordered by how much they matter to a student.

---

## Errors that would teach the wrong thing

### 1. The methodology worked example uses the standard deviation instead of the standard error

**Where:** *Problem Solving Methodology → Estimating Intervals → Example*

The example samples 100 vehicles, mean 25 mph, standard deviation 2 mph, and
computes:

```
NORM.INV(0.025, 25, 2) = 21.08
NORM.INV(0.975, 25, 2) = 28.92
95% CI = 25 ± 3.92 mph
```

The spread parameter should be the **standard error**, 2 ÷ √100 = 0.2, not the
standard deviation of 2:

```
NORM.INV(0.025, 25, 0.2) = 24.61
NORM.INV(0.975, 25, 0.2) = 25.39
95% CI = 25 ± 0.39 mph
```

The published interval is exactly √n = 10 times too wide.

**Why this one is first.** It appears in the section students are told to use
as a template, and it contradicts the Case table on the very same page, which
correctly specifies σ/√n. It also demonstrates precisely the mistake the
tutorial questions are designed to catch — a student who follows the example
faithfully will get Tutorial 3 wrong. Corrected on the
[methodology page](methodology.html), with a note explaining the difference.

### 2. Tutorial 5 Q2(d) divides by the wrong total

**Where:** *Tutorial 5, Question 2, part 4*

The question asks for "the proportion of carless people who are employed". The
solution computes 21 ÷ 151 = 0.139, using the **employed** row total as the
denominator — which answers the reverse question, "what proportion of employed
people are carless".

As asked, the denominator is the carless column total:

```
21 ÷ 291 = 0.072
```

The stated formula in the handout (`n_no-car,employed / n_employed`) matches its
arithmetic but not its own question text. The site uses 0.072 and offers 0.139
as a recognised wrong answer with an explanation.

### 3. Tutorial 5 Q4 swaps the regression coefficient labels

**Where:** *Tutorial 5, Question 4, coefficient derivation*

The handout states:

> Intercept coefficient b = s_xy / s_xx = 36.138

But S_xy ÷ S_xx = 17685.1 ÷ 107702.5 = **0.164**, which is the *gradient*, not
the intercept. The intercept is b = ȳ − a·x̄ = 36.138.

The final model, `r = 0.164w + 36.138`, is correct — only the derivation is
mislabelled. The site derives a = S_xy ÷ S_xx and b = ȳ − a·x̄ in that order.

---

## Wrong numbers

### 4. Tutorial 1 Q6 mixes sample and population formulas in one table

**Where:** *Tutorial 1, Question 6, comparison table*

Question 2 reports a standard deviation of 10.67 and a variance of 113.99 for
the full data set, using `STDEV.S` and `VAR.S`. The Question 6 table reports
10.58 and 111.92 in its "With Outlier" column. Those are the **population**
values:

| | Sample (`.S`) | Population (`.P`) |
|---|---|---|
| Standard deviation | 10.68 | 10.58 |
| Variance | 113.99 | 111.92 |

So the table's "with outlier" column was computed with `STDEV.P`/`VAR.P` while
its "without outlier" column (9.37, 87.78) used the sample versions — the two
halves of the same table use different formulas.

The **Difference** column confirms it: it lists a variance difference of 26.21,
which is 113.99 − 87.78, using the *sample* value that does not appear in the
cell above it. (111.92 − 87.78 = 24.14.) The standard deviation difference of
1.31 is likewise 10.68 − 9.37.

The site uses the sample values throughout, which is correct for survey data.

### 5. Tutorial 5 Q2, expected value for homemakers without a car

**Where:** *Tutorial 5, Question 2, expected value matrix*

Printed as 53.118. The calculation is 104 × 291 ÷ 569 = **53.188** — a
transposed digit. It does not change the test statistic materially.

### 6. Tutorial 5 Q2, χ² statistic quoted two ways

The table sums to **140.07**; the text that follows says 140.7. The table is
right. Either way the conclusion is unchanged (the critical value is 15.09).

### 7. Tutorial 5 Q4, sum of squares quoted two ways

S_yy is given as 3442.51 in the parameter table and 3422.51 in the R²
calculation. The correct value is **3442.51** (Σr² − nȳ²). R² = 0.84 either way.

### 8. Tutorial 1 Q2, standard deviation rounding

The handout prints 10.67 alongside a variance of 113.99, but √113.99 = 10.6766,
which rounds to **10.68**. The variance is treated as authoritative here since
it carries more significant figures; the site accepts both 10.67 and 10.68.

### 9. Tutorial 2 Q2(c), inverse normal rounding

Printed as 44.73. `NORM.INV(0.95, 25, 12)` = 44.7382, which rounds to
**44.74**. Both accepted.

---

## Wrong function names and notation

### 10. `CHI.INV.RT` does not exist

**Where:** *Tutorial 5, Question 2*

> we can calculate the critical value using =CHI.INV.RT(alpha, df)

The function is **`CHISQ.INV.RT`**. The handout uses the correct name later in
Question 3, so this is a typo rather than a misunderstanding — but a student
typing it verbatim gets `#NAME?`.

### 11. `MODE` is deprecated

**Where:** *Tutorial 1, Question 2*

`MODE` still works, but the current function is **`MODE.SNGL`** (with
`MODE.MULT` when several values tie). The site uses the modern names throughout.

### 12. Variance quoted in the wrong units

**Where:** *Tutorial 3, Question 6*

> the variance was found to be 9mph

Variance is in squared units, so this should read **9 mph²**. It matters here
because the units are what tell you the standard deviation is 3 mph rather than
9 — and a student who misses it gets every sigma interval wrong by a factor of
three.

---

## Places where the reasoning does not match the question

### 13. Tutorial 3 Q5 keeps Question 4's justification

**Where:** *Tutorial 3, Question 5*

The solution says:

> We do not know the underlying distribution or variance

but the question explicitly supplies both ("assume the population variance is 64
and the weights are normally distributed"). The text was copied from Question 4
and not updated.

Relatedly, it selects **Case 4** where the stated conditions are those of
**Case 1** — a normal population with known variance. The arithmetic is
unaffected, since both cases use the inverse normal, but the justification
should be the stronger one.

### 14. Tutorial 2 Q3(b) never states its answer

**Where:** *Tutorial 2, Question 3, part 2*

The solution sets up `=BINOM.DIST(9, 85, 0.14, TRUE)` and explains each argument
but never gives the result, so a student cannot check themselves. It is
**0.2316**.

### 15. Tutorial 2 Q4(c) is genuinely ambiguous

**Where:** *Tutorial 2, Question 4, part 3*

"The maximum number of calls in any given minute that would be expected 95% of
the time", with λ = 4:

- P(X ≤ 7) = 0.9489 — the largest n still *within* 95%
- P(X ≤ 8) = 0.9786 — the smallest n giving *at least* 95%

The handout answers 7. R's `qpois(0.95, 4)` and SciPy's `poisson.ppf(0.95, 4)`
both return **8**, because they use the "at least" convention — so a student
working in R will disagree with a student working in Excel and both will be
right. The site accepts either and explains the difference.

### 16. Tutorial 2 Q2(c), question and solution headings disagree

The question asks for the "lowest travel time that would still put the traveller
in the slowest 5%"; the solution heading says "slowest travel time". The answer
of 44.74 minutes is correct for the question as asked.

---

## Not errors, but worth flagging

### 17. Tutorial 4 Q4 uses a z-test with sample standard deviations

The two-sample z-test is applied with standard deviations estimated from the
samples (n = 50 and 40). This is defensible — the central limit theorem is doing
the work at these sample sizes — but a two-sample **t**-test is the more standard
choice when population variances are unknown.

Not changed, since the handout's answer is sound. The site flags it so that
students who reach for a t-test are not told they are wrong: with 88 degrees of
freedom the critical value is 1.987 against the normal's 1.96, and the
conclusion is identical.

### 18. Tutorial 5 Q4 predictions use the rounded gradient

The predictions use a = 0.164 rather than the full-precision 0.1642077. At
w = 90 the difference is 0.02 m; at w = 1200 it is 0.24 m.

Both are accepted, and the site uses it to make a point about rounding at the
end of a calculation rather than in the middle.

### 19. Tutorial 1 Q6 skew difference

Listed as 0.50; 1.20 − 0.69 = 0.51. Pure rounding, no consequence.

---

## The datasets

The handout refers throughout to an accompanying Excel data file, which was not
in the project folder. The datasets in `data/` were **generated to reproduce
every summary statistic the handout publishes**, so all its worked answers
remain correct:

| Dataset | Constraints matched |
|---|---|
| Travel times | n = 55, all 13 histogram bin counts, mean 22.58, median 19, mode 12, variance 113.99, skew 1.20, quartiles 14.5/19/30.5, single outlier at 61 — and the full Question 6 table after the outlier is removed |
| Fuel consumption | n = 27, mean 10.08 |
| HGV weights | n = 38, mean 22.29, sd 7.59 |
| Junction waiting | n = 30 pairs, mean difference −8.4, sd of differences 4.99 |

Tutorial 5's contingency tables and regression data are given in full in the
handout and were used as printed.

If you still have the original data file, drop it in and re-run
`python tools/verify_answers.py` — it will tell you immediately whether the
published answers hold against the real numbers.
