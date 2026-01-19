FROM python:3.10

WORKDIR /app

COPY app/requirements.txt .

RUN pip install -r requirements.txt

COPY app .

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "main:app"]

