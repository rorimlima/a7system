# Use a slim Python 3.12 image
FROM python:3.12-slim

# Labels for metadata
LABEL maintainer="A7SYSTEM"
LABEL version="1.0.0"
LABEL description="A7SYSTEM Backend API"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Run the application using uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
