FROM r-base:4.0.3
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get install -y --no-install-recommends build-essential libpq-dev python3.9 python3-pip python3-setuptools python3-dev curl r-cran-dplyr r-cran-jsonlite r-cran-purrr r-cran-tidyr r-cran-rmarkdown libgdal-dev
RUN install2.r leaflet
RUN pip3 install --upgrade pip

# Install Quarto
RUN mkdir -p /opt/quarto/0.9.522
RUN curl -o quarto.tar.gz -L "https://github.com/quarto-dev/quarto-cli/releases/download/v0.9.522/quarto-0.9.522-linux-amd64.tar.gz"
RUN tar -zxvf quarto.tar.gz \
    -C "/opt/quarto/0.9.522" \
    --strip-components=1

RUN rm quarto.tar.gz
WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
# Install additional R dependecies

# Install python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
RUN apt-get install -y --no-install-recommends r-cran-htmlwidgets r-cran-here

COPY ./app /code/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8812"]
