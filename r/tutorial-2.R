# ==========================================================================
# Tutorial 2 — Parametric Distributions and Probability Modelling
# ==========================================================================
#
# Excel calculates these probabilities in one line. The difficult part is
# choosing the right distribution, then rewriting the probability you want
# into a form the function can calculate.
#
# Questions and answer checking:
#   https://chris-r-uol.github.io/stats_learning/tutorial.html?t=2
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


# --------------------------------------------------------------------------
# Question 1 — Visualising probability intervals
# --------------------------------------------------------------------------
#
# X is a normal distribution with mean 0 and standard deviation 1. For
# each statement below, sketch the curve on paper and shade the area
# described. Then choose the diagram that matches your sketch.

# 1. 1 − P(X > c), where c may be any number.

# 2. P(X < −c) = P(X > c), where c > 0.

# 3. P(a < X < b), where a < b.


# --------------------------------------------------------------------------
# Question 2 — The normal distribution
# --------------------------------------------------------------------------
#
# The time to walk between Leeds train station and the University of Leeds
# campus follows a normal distribution. The mean is 25 minutes and the
# standard deviation is 12 minutes. One traveller took exactly 15 minutes.

# 1. How many standard deviations from the mean is the 15-minute journey?


# 2. Which function gives the probability of a journey taking less than 15
#   minutes?

# 3. What is the probability that a randomly selected person makes the
#   journey in less than 15 minutes?


# 4. What is the lowest travel time that would still put a traveller in
#   the slowest 5% of journeys? (minutes)



# --------------------------------------------------------------------------
# Question 3 — The binomial distribution
# --------------------------------------------------------------------------
#
# A researcher asks train passengers whether they hold a season ticket.
# The rail company says 14% of passengers have one. There are 85
# passengers on the train.
#
# Use the binomial distribution when you have a fixed number of
# independent trials, and each trial has the same probability of success.

# 1. How many combinations of outcomes are possible if the researcher asks
#   everyone on the train?


# 2. What is the probability that fewer than 10 people on the train have a
#   season ticket?


# 3. What is the probability that more than 15 people on the train have a
#   season ticket?


# 4. What is the probability that exactly 8 people on the train have a
#   season ticket?



# --------------------------------------------------------------------------
# Question 4 — The Poisson distribution
# --------------------------------------------------------------------------
#
# The Poisson distribution counts events in a fixed period of time or
# space, when you know the average rate.
#
# The binomial has a fixed number of trials. The Poisson does not. There
# is no upper limit on how many cars can pass a detector in an hour.

# 1. Applications for a new position at ITS arrive at an average of 3 per
#   hour. What is the probability of receiving exactly 1 application in
#   the next hour?


# 2. Cars pass a detector at an average of 7 per hour. What is the
#   probability of seeing more than 10 cars in the next hour?


# 3. A help centre receives an average of 4 calls per minute. What is the
#   maximum number of calls in a minute that you would expect 95% of the
#   time? (calls)
