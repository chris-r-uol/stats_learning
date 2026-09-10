# ==========================================================================
# Tutorial 4 — Hypothesis Testing
# ==========================================================================
#
# A hypothesis test answers one question: did something really change, or
# is this just random variation? Tutorial 5 uses these methods throughout.
#
# Questions and answer checking:
#   https://chris-r-uol.github.io/stats_learning/tutorial.html?t=4
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

junction <- read.csv(file.path(DATA, "junction-waiting.csv"))

head(junction)


# --------------------------------------------------------------------------
# Question 1 — Stating hypotheses
# --------------------------------------------------------------------------
#
# For each statement, choose a null and an alternative hypothesis.
#
# H₀ always states that nothing has changed. You assume there is no effect
# until the data gives you reason to think otherwise.
#
# Example: "In the US there are 1.9 vehicles per household" gives H₀: μ =
# 1.9 and H₁: μ ≠ 1.9. Here μ is the mean number of vehicles per
# household.

# 1. The arrival time of public transport is within 5 minutes of its
#   scheduled time.

# 2. The average fuel consumption of hybrid vehicles is the same as for
#   internal-combustion vehicles.

# 3. Reducing the motorway speed limit from 70 mph to 50 mph reduces
#   accident frequency.


# --------------------------------------------------------------------------
# Question 2 — Type 1 and Type 2 errors
# --------------------------------------------------------------------------
#
# For each statement in Question 1, state the Type 1 and Type 2 errors.
#
# Example (vehicles per household):
#
# - Type 1: we REJECT H₀ when it is true. We conclude the mean is not 1.9
#   when it is.
# - Type 2: we DO NOT REJECT H₀ when it is false. We conclude the mean is
#   1.9 when it is not.

# 1. Which describes a Type 1 error?

# 2. For the speed limit study, H₀ states that the change to 50 mph made
#   no difference to accident frequency. Which is the Type 2 error?

# 3. You reduce α from 0.05 to 0.01 and change nothing else. What happens
#   to the two error rates?

# 4. For the hybrid fuel consumption study, write both error types as full
#   sentences. Then say which would concern you more if you were advising
#   a transport authority about buying vehicles.


# --------------------------------------------------------------------------
# Question 3 — One-sample z-test
# --------------------------------------------------------------------------
#
# Years of data show that delays on the Cross Country Express line have a
# population standard deviation of 3.5 minutes. The average delay has been
# 12 minutes.
#
# After a signalling upgrade, the rail authority measures 100 journeys.
# The sample mean is 10.9 minutes.
#
# Using α = 0.05, is there enough evidence that the upgrade reduced the
# average delay?

# 1. Set up the test.

# 2. What is the standard error?


# 3. What is the z test statistic?


# 4. What is the p-value?


# 5. What do you conclude at α = 0.05?


# --------------------------------------------------------------------------
# Question 4 — Comparing two independent samples
# --------------------------------------------------------------------------
#
# A study of train reliability on the Leeds–Ilkley line in 2016 measured
# 50 trains. The mean lateness was 3.9 minutes, with a standard deviation
# of 2.1 minutes.
#
# A second study in 2017 measured 40 trains. The mean lateness was 4.8
# minutes, with a standard deviation of 1.9 minutes.
#
# Is this evidence of a significant change in lateness?

# 1. Set up the test.

# 2. What is the standard error of the difference between the means?


# 3. What is the z test statistic?


# 4. What is the critical z value at α = 0.05?


# 5. What is the p-value?


# 6. What do you conclude?


# --------------------------------------------------------------------------
# Question 5 — Paired samples
# --------------------------------------------------------------------------
#
# Waiting time at a junction was measured before and after a development
# project. The data is on the T4 Junction Waiting sheet. Decide whether
# the waiting time changed significantly.
#
# This question gives you the raw data, so you can check your answer a
# second way.

# 1. Why is a paired test the right choice here?

# 2. What is the mean of the differences (after − before)? (seconds)


# 3. What is the standard deviation of the differences? (seconds)


# 4. What is the t test statistic?


# 5. How many degrees of freedom?


# 6. What is the critical t value at α = 0.05, two-tailed?


# 7. Which is closest to the p-value?

# 8. What do you conclude?
