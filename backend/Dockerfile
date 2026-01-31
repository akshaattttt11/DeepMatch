FROM python:3.10-slim

WORKDIR /app

# system deps for some python packages
RUN apt-get update && apt-get install -y build-essential gcc libpq-dev git curl && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage layer caching
COPY backend/requirements.txt /app/requirements.txt

RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy app code
COPY backend /app

ENV PYTHONUNBUFFERED=1

EXPOSE 5000

# Use eventlet worker for Socket.IO
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "wsgi:app", "--bind", "0.0.0.0:5000", "--timeout", "120"]

