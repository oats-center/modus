
# load libraries

library(dplyr)
library(plotly)

# create function to select variable to plot

selectVar <- function(selectedVar) {
  df %>%
    subset(Element == selectedVar) %>%
    tidyr::pivot_wider(
      names_from = Element,
      values_from = Value
    ) %>%
    dplyr::select(EventDate, SampleID, selectedVar)
}

# create function to plot variable

plotVar <- function(df, yaxisTitle) {
  quo_y <- enquo(df)

  plot <- plotly::plot_ly(
    data = df,
    color = ~SampleID,
    colors = "Set3",
    x = ~EventDate,
    y = quo_y,
    type = "scatter",
    mode = "markers"
  ) %>%
    plotly::layout(
      xaxis = list(title = "Sample Date"),
      yaxis = list(title = yaxisTitle),
      legend = list(title = list(text = "<b> Sample ID </b>"))
    ) %>%
    plotly::config(
      displayModeBar = TRUE,
      displaylogo = FALSE
    )

  return(plot)
}
