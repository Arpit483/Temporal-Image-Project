# Stage 1: Build the React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Python Backend Environment
FROM python:3.11-slim
WORKDIR /app

# Install system libraries needed by OpenCV and NetCDF4
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy application files
COPY framefill framefill
COPY results results
COPY third_party third_party
COPY examples examples

# Copy built frontend assets from Stage 1 into web/dist
COPY --from=frontend-builder /app/web/dist web/dist

# Expose HTTP port
EXPOSE 8000

ENV FRAMEFILL_RIFE_DIR=/app/third_party/rife_pkg
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "framefill.api:app", "--host", "0.0.0.0", "--port", "8000"]
