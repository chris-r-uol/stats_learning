# ==========================================================================
# Tutorial 5 — Relationships Within Data
# ==========================================================================
#
# The earlier tutorials looked at one variable at a time. This tutorial
# looks at pairs. Are two categories linked? Can one number predict
# another?
#
# Questions and answer checking:
#   https://chris-r-uol.github.io/stats_learning/tutorial.html?t=5
#
# This file gives you the questions and the data. Work out each answer
# here, then enter it on the website to check it.
#
# The method tables and figures for this tutorial (for example the case
# table, or the list of which test to use) are on the website page above.


# Find data/csv from wherever this script is run.
find_data <- function() {
  d <- normalizePath(getwd())
  while (!dir.exists(file.path(d, "data", "csv")) && dirname(d) != d) {
    d <- dirname(d)
  }
  file.path(d, "data", "csv")
}
DATA <- find_data()

taxi <- read.csv(file.path(DATA, "taxi-queue.csv"))
cars <- read.csv(file.path(DATA, "car-ownership.csv"))
accidents <- read.csv(file.path(DATA, "accidents-weather.csv"))
reaction <- read.csv(file.path(DATA, "reaction-distance.csv"))

head(taxi)


# --------------------------------------------------------------------------
# Question 1 — Relative frequency and probability
# --------------------------------------------------------------------------
#
# The table shows the number of people in a queue at a taxi rank, and how
# often each number was observed.
#
# Relative frequency estimates probability: f&#8341; = n&#8341; ÷ N.

# 1. What is N, the total number of observations?


# 2. Complete the relative frequency row.


# 3. What is the probability that a queue contains fewer than four people?


# 4. What is the probability that a queue contains more than three people?


# 5. Two queues are observed. What is the probability that the first
#   contains three people and the second contains five?



# --------------------------------------------------------------------------
# Question 2 — Contingency tables and independence
# --------------------------------------------------------------------------
#
# Complete the contingency table by adding the rows and columns.

# 1. Give the column totals and the grand total.


# 2. What proportion of people are students?


# 3. What proportion of people have a car?


# 4. What proportion of students have a car?


# 5. What proportion of carless people are employed?


# 6. Set up the test for whether car ownership is independent of
#   employment status.

# 7. Calculate the expected value for employed people with a car under the
#   null hypothesis.


# 8. What is the χ² test statistic for the whole table?


# 9. How many degrees of freedom does this table have?


# 10. What is the critical value at 1% significance?


# 11. What do you conclude at 1% significance?


# --------------------------------------------------------------------------
# Question 3 — When the expected values are too small
# --------------------------------------------------------------------------
#
# Road accidents in Leeds and Manchester, by road surface condition.
#
# This looks like Question 2. One difference makes the test invalid unless
# you find it.

# 1. Complete the totals.


# 2. What is the expected number of ice accidents in Manchester?


# 3. What does that expected value tell you?

# 4. What is the correct fix?

# 5. After combining snow and ice, what is the expected value for Leeds in
#   that column?


# 6. What is the χ² test statistic for the combined table?


# 7. How many degrees of freedom does the combined table have?


# 8. What is the critical value at 5% significance?


# 9. Test at 5% significance. H₀ states that the pattern of accidents
#   across weather types is the same in Leeds and Manchester.


# --------------------------------------------------------------------------
# Question 4 — Least-squares regression
# --------------------------------------------------------------------------
#
# A study measured how the warning distance before a motorway closure
# affects the reaction distance of drivers.
#
# Fit a model of the form r = aw + b using least squares.

# 1. Start by plotting reaction distance against warning distance as a
#   scatter chart. What does the relationship look like?

# 2. Calculate the summary quantities.


# 3. What is the gradient a?


# 4. What is the intercept b?


# 5. What is the R² value?


# 6. Use the model to predict the reaction distance at each warning
#   distance.


# 7. Which of these predictions can you trust? Select all that apply.

# 8. Test whether the gradient is different from zero at 95% confidence.
#   What is the t statistic?


# 9. What do you conclude about the gradient?
