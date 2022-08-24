
FROM python:3.9
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY ./app /code/app
ENV STREAMLIT_SERVER_PORT=8813
CMD ["streamlit", "run", "/code/app/main.py"]
