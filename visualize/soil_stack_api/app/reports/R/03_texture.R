# load libraries

library(soiltexture)
library(dplyr)
library(tidyr)
library(DT)

# get texture data

dfTexture <- df %>%
  dplyr::select(EventDate, SampleID, UniqueSampleID, Name, Element, Value) %>%
  subset(Element %in% c("Sand", "Silt", "Clay")) %>%
  tidyr::pivot_wider(
    names_from = Element,
    values_from = Value
  ) %>%
  as.data.frame()

# soiltexture requires uppercase names

names(dfTexture) <- toupper(names(dfTexture))

# create function to plot triangle

makeTriangle <- function(data, title, color) {
  soiltexture::TT.plot(
    class.sys = "USDA.TT",
    tri.data = data,
    main = title,
    cex.main = 1, # size of title text
    cex.axis = 0.7, # size of axis text
    cex.lab = 0.7, # size of label text
    lwd.axis = 0.5, # line width of axis
    lwd.lab = 0.5, # line width of labels
    pch = 16, # point type
    col = color, # color of points
    frame.bg.col = "#f2f2f2", # color of triangle bg
  )
}

# create DT

textureDT <- dplyr::select(dfTexture, -UNIQUESAMPLEID)

textureDT <- DT::datatable(textureDT,
  rownames = FALSE,
  colnames = c(
    "Sample Date",
    "Sample ID",
    "Sample Depth (cm)",
    "Sand (%)",
    "Silt (%)",
    "Clay (%)"
  )
)
