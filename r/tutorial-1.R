# ==========================================================================
# Tutorial 1 — Descriptive Statistics and Data Visualisation
# ==========================================================================
#
# This tutorial covers how to describe a set of data. You will identify
# the type of data, calculate summary statistics, draw two charts, and
# find an outlier.
#
# Questions and answer checking:
#   https://chris-r-uol.github.io/stats_learning/tutorial.html?t=1
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

travel_times <- read.csv(file.path(DATA, "travel-times.csv"))

head(travel_times)


# --------------------------------------------------------------------------
# Question 1 — Types of data
# --------------------------------------------------------------------------
#
# Data can be continuous, discrete, grouped, ordinal or nominal. Choose
# the type for each example below.
#
# A reminder of the five types:
#
# - Continuous — any value in a range, including fractions (rainfall in
#   mm)
# - Discrete — whole numbers only (number of bicycles sold)
# - Grouped — numbers sorted into bands (income of £20–30k)
# - Ordinal — categories with an order (poor / fair / good)
# - Nominal — categories with no order (paint colours)

# 1. Speed of a moving vehicle over time.

# 2. Ranking of traffic congestion (high, medium, low).

# 3. Age range of drivers involved in accidents (18–25, 26–35, 36–45,
#   45+).

# 4. Vehicle types (car, lorry, bus, and so on).

# 5. Number of passengers on a bus.


# --------------------------------------------------------------------------
# Question 2 — Descriptive statistics
# --------------------------------------------------------------------------
#
# A survey recorded the time to travel between two locations. Use the data
# in B4:B58 to calculate the statistics below.

# 1. How many observations are in the data set?


# 2. What is the mean travel time? (minutes)


# 3. What is the median travel time? (minutes)


# 4. What is the mode? (minutes)


# 5. Which function gives the standard deviation of this data?

# 6. What is the standard deviation? (minutes)


# 7. What is the variance?


# 8. What is the skewness?


# 9. Give the first, second and third quartiles.



# --------------------------------------------------------------------------
# Question 3 — Histogram
# --------------------------------------------------------------------------
#
# The counts are on the T1 Histogram Guide sheet. Draw a histogram of
# travel time using relative frequency density and a class width of 5.
#
# Add three columns to your sheet:
#
# - Relative frequency = count in bin ÷ total count
# - Relative frequency density = relative frequency ÷ class width
# - Cumulative relative frequency = running total of the relative
#   frequencies
#
# Then complete the three rows below to check your columns.

# 1. Complete these three rows of your table.


# 2. Which column do you plot to draw the histogram?


# --------------------------------------------------------------------------
# Question 4 — Cumulative relative frequency plot
# --------------------------------------------------------------------------
#
# Draw a cumulative relative frequency plot of travel time, using a class
# width of 5. You already have the column from Question 3.

# 1. What should the last point on this plot equal?

# 2. Reading from your plot, what share of journeys took 20 minutes or
#   less?



# --------------------------------------------------------------------------
# Question 5 — Outliers
# --------------------------------------------------------------------------
#
# Use the histogram and the cumulative frequency plot to find the
# outliers. How many are there, and what are their values?

# 1. How many outliers are in the data set?


# 2. What is its value? (minutes)


# 3. What should you do with the outlier?


# --------------------------------------------------------------------------
# Question 6 — The effect of removing the outlier
# --------------------------------------------------------------------------
#
# Repeat Question 2 with the outlier removed. Then compare the two sets of
# results. One value out of 55 changes some statistics a lot and others
# very little.

# 1. Mean, with the outlier removed. (minutes)


# 2. Standard deviation, with the outlier removed. (minutes)


# 3. Skewness, with the outlier removed.


# 4. Which statistic changed most when the outlier was removed?

# 5. In two or three sentences, explain what this comparison shows about
#   handling outliers. Write it for a colleague who does not use
#   statistics.
