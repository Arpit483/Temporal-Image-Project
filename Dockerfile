# ═══════════════════════════════════════════════════════════════════════════════
# Stage 1 – Build the React / Vite frontend
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-slim AS frontend-builder
WORKDIR /app/web

# Install deps first (layer-cached unless package.json changes)
COPY web/package*.json ./
RUN npm ci

# Build production bundle → web/dist/
COPY web/ ./
RUN npm run build

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2 – Python runtime + application
# ═══════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim
WORKDIR /app

# System libraries required by OpenCV-headless and netCDF4
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies (layer-cached unless requirements.txt changes) ─────────
COPY requirements.txt .
RUN pip install --no-cache-dir \
        python-dotenv \
        -r requirements.txt && \
    pip install --no-cache-dir \
        torch torchvision \
        --index-url https://download.pytorch.org/whl/cpu

# ── Application source ─────────────────────────────────────────────────────────
COPY framefill/ framefill/
COPY third_party/ third_party/
COPY examples/ examples/

# Only the runtime-needed subset of results/ (NC sequences + CSVs, no .npz)
COPY results/*.nc results/
COPY results/*.csv results/

# ── Compiled React SPA from Stage 1 ───────────────────────────────────────────
COPY --from=frontend-builder /app/web/dist web/dist

# ── Runtime configuration ──────────────────────────────────────────────────────
EXPOSE 8000

ENV FRAMEFILL_RIFE_DIR=/app/third_party/rife_pkg \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Non-root user for security
RUN groupadd --gid 1001 framefill && \
    useradd --uid 1001 --gid framefill --no-create-home framefill && \
    chown -R framefill:framefill /app
USER framefill

# Health-check so orchestrators know when the API is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "framefill.api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
