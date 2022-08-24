# import libraries

library(dplyr)
library(jsonlite)
library(purrr)
library(tidyr)
library(here)

# list all files in directory

files <- list.files(
  path = paste0(here::here(), "/code/app/reports/tomkat-historic"),
  pattern = "*.json",
  full.names = TRUE
)

# import json file from 2015

data2015 <- jsonlite::fromJSON(
  txt = files[4],
  flatten = TRUE
)

# import json file from 2018

data2018 <- jsonlite::fromJSON(
  txt = files[12],
  flatten = TRUE
)

# function to unnest all lists and wrangle data

processJSON <- function(dataFile) {
  df <- dataFile %>%
    purrr::map(1) %>%
    dplyr::bind_rows(.id = SampleMetaData.FMISSampleID) %>%
    tidyr::unnest(cols = c(
      LabMetaData.Reports,
      EventSamples.Soil.DepthRefs,
      EventSamples.Soil.SoilSamples
    )) %>%
    tidyr::unnest(
      cols = Depths,
      names_repair = "minimal"
    ) %>%
    tidyr::unnest(
      cols = NutrientResults,
      names_repair = "minimal"
    ) %>%
    dplyr::rename(
      EventDate = EventMetaData.EventDate,
      EventType.Soil = EventMetaData.EventType.Soil,
      SampleNumber = SampleMetaData.SampleNumber,
      SampleID = SampleMetaData.FMISSampleID,
      Geometry = SampleMetaData.Geometry.wkt
    ) %>%
    # need to replace Bulk Density with BulkDensity for plot function to work
    dplyr::mutate(
      Element = ifelse(Element == "Bulk Density",
        "BulkDensity",
        Element
      ),
      # round to 2 digits
      Value = round(Value, 2)
    )
  return(df)
}

# read in both files then bind

df2015 <- processJSON(dataFile = data2015$Events)

df2018 <- processJSON(dataFile = data2018$Events)

df <- as.data.frame(rbind(df2015, df2018))

# create unique SampleID from PointID and Date

df$UniqueSampleID <- paste0(df$EventDate, "_", df$SampleID)

# TODO: iterate through all json files in the directory and append to one df
