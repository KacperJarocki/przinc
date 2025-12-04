FROM python:3.10

WORKDIR /app

COPY app/requirements.txt .

RUN pip install -r requirements.txt

COPY app .

CMD ["python", "main.py"]

