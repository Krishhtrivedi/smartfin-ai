# Multi-stage Dockerfile for SmartFin AI (Vichar Vimarsh)

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with Embedded Static SPA
FROM python:3.9-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Baileys WhatsApp Bridge dependencies
COPY backend/whatsapp_bridge/package*.json ./backend/whatsapp_bridge/
RUN cd backend/whatsapp_bridge && npm install --omit=dev

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

# Bind dynamically to Render's assigned $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir backend"]
