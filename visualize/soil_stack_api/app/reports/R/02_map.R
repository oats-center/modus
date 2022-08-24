# import libraries
library(dplyr)
library(tidyr)
library(leaflet)
library(leaflet.minicharts)

# create dataframe for map

dfW <- df %>% na.omit()

dfW <- df %>% pivot_wider(
  id_cols = c(Geometry, UniqueSampleID),
  names_from = Element,
  values_from = Value
)

# parse coordinates into separate columns

dfW <- dfW %>%
  tidyr::separate(Geometry,
    into = c("long", "lat"),
    sep = " "
  )

dfW$long <- as.numeric(regmatches(
  dfW$long,
  gregexpr("(?>-)*[[:digit:]]+\\.*[[:digit:]]*",
    dfW$long,
    perl = TRUE
  )
))

dfW$lat <- as.numeric(regmatches(
  dfW$lat,
  gregexpr("(?>-)*[[:digit:]]+\\.*[[:digit:]]*",
    dfW$lat,
    perl = TRUE
  )
))

# initiate the leaflet instance and store it to a variable
m <- leaflet()

# we want to add map tiles so we use the addTiles() function - the default is openstreetmap
m <- addTiles(m)

# we can add markers by using the addMarkers() function
m <- addMarkers(m, lng = mean(dfW$long), mean(dfW$lat), popup = "Hackathon")

m <- addCircleMarkers(m,
  lng = dfW$long, # we feed the longitude coordinates
  lat = dfW$lat,
  radius = 2,
  stroke = FALSE,
  fillOpacity = 0.75
)

m <- addMinicharts(m,
  dfW$long, dfW$lat,
  chartdata = dfW[, c("BulkDensity", "pH", "TOC")],
  width = 45, height = 45
)

m

# TODO:
# can we add the UniqueSampleID to the top of each popup?
# add all parameters to the popup but not necessarily show them as charts?
