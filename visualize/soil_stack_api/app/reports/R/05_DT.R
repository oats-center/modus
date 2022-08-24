# load libraries
library(DT)
library(dplyr)
library(tidyr)

# create DT datatable with all parameters

dfDT <- df %>%
  dplyr::select(EventDate, SampleID, Name, Element, Value) %>%
  subset(!Element %in% c("Sand", "Silt", "Clay")) %>%
  tidyr::pivot_wider(
    names_from = Element,
    values_from = Value
  ) %>%
  dplyr::rename(
    "Sample Date" = EventDate,
    "Sample ID" = SampleID,
    "Sample Depth (cm)" = Name,
    "Bulk Density" = BulkDensity,
    "P (ug/g)" = P,
    "CEC (cmol(+)/kg)" = CEC,
    "Ca (cmol(+)/kg)" = Ca,
    "Mg (cmol(+)/kg)" = Mg,
    "K (cmol(+)/kg)" = K,
    "Na (cmol(+)/kg)" = Na,
    "TOC (%)" = TOC,
    "TN (%)" = TN
  ) %>%
  as.data.frame()

allDT <- DT::datatable(dfDT,
  rownames = FALSE,
)
allDT
