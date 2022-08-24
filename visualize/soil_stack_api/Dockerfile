
FROM python:3.9
WORKDIR /code
ENV QUARTO_VERSION="0.9.522"
RUN mkdir -p /opt/quarto/${QUARTO_VERSION}

RUN curl -o quarto.tar.gz -L "https://github.com/quarto-dev/quarto-cli/releases/download/v0.9.522/quarto-0.9.522-linux-amd64.tar.gz"

RUN tar -zxvf quarto.tar.gz \
    -C "/opt/quarto/0.9.522" \
    --strip-components=1

RUN rm quarto.tar.gz

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY ./app /code/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8812"]
