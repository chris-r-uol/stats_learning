# ==========================================================================
# Tutorial 3 — Sampling Distributions and Interval Estimation
# ==========================================================================
#
# You rarely measure a whole population. You measure a sample, then make a
# claim about the population. A confidence interval states how precise
# that claim is.
#
# Questions and answer checking:
#   https://chris-r-uol.github.io/stats_learning/tutorial.html?t=3
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

fuel <- read.csv(file.path(DATA, "fuel-consumption.csv"))
hgv <- read.csv(file.path(DATA, "hgv-weights.csv"))

head(fuel)


# --------------------------------------------------------------------------
# Question 1 — Critical values
# --------------------------------------------------------------------------
#
# A normal distribution has mean μ = 25 and standard deviation 3. Find the
# critical value c where P(μ − c < X < μ + c) = 0.95.
#
# This question is about the distribution itself, not about a sample. Use
# the standard deviation, not a standard error.

# 1. What area lies in each tail?


# 2. Give the lower and upper bounds of the interval.


# 3. What is the critical value c?



# --------------------------------------------------------------------------
# Question 2 — The same method, different numbers
# --------------------------------------------------------------------------
#
# A normal distribution has mean −2 and standard deviation 0.1. Find the
# critical value c where P(μ − c < X < μ + c) = 0.99.
#
# Use the method from Question 1. The mean is negative and the confidence
# level has changed.

# 1. What area lies in each tail now?


# 2. Give the lower and upper bounds.


# 3. What is the critical value c?



# --------------------------------------------------------------------------
# Question 3 — Fuel consumption
# --------------------------------------------------------------------------
#
# A study measured the fuel consumption of 27 cars. The data is on the T3
# Fuel Consumption sheet. The population standard deviation is 1.3
# L/100km.

# 1. What is the mean of the sample data? (L/100km)


# 2. Which case from the table applies here?

# 3. What is the spread parameter (the standard error) for the interval?


# 4. Estimate a 95% confidence interval for the population mean fuel
#   consumption. (L/100km)


# 5. What happens to the 95% confidence interval if you increase the
#   sample size?


# --------------------------------------------------------------------------
# Question 4 — HGV weights
# --------------------------------------------------------------------------
#
# Noise pollution may be linked to heavy goods vehicles. The weight of 38
# vehicles was measured. The data is on the T3 HGV Weights sheet.
#
# Estimate the mean weight of HGVs on these roads, with a 95% confidence
# interval. You are given nothing about the population, only the sample.

# 1. What is the sample mean? (tonnes)


# 2. What is the sample standard deviation? (tonnes)


# 3. Which case applies?

# 4. Give the 95% confidence interval for the mean HGV weight. (tonnes)



# --------------------------------------------------------------------------
# Question 5 — What extra knowledge buys you
# --------------------------------------------------------------------------
#
# Repeat Question 4. This time, assume the population variance is 64 and
# that vehicle weights are normally distributed. What has changed?

# 1. What is the population standard deviation? (tonnes)


# 2. Which case applies now?

# 3. Give the new 95% confidence interval. (tonnes)


# 4. The interval is wider than in Question 4, although you now know more.
#   Explain why. Then say whether the new interval is better or worse.


# --------------------------------------------------------------------------
# Question 6 — Sigma notation
# --------------------------------------------------------------------------
#
# Some fields state confidence as n-sigma. This counts how many standard
# deviations the interval covers.
#
# A study of driving speed on a motorway measured 100 vehicles. The
# average speed was 64 mph. The variance was 9 mph².

# 1. What is the standard deviation? (mph)


# 2. Give the half-width of each sigma interval.
