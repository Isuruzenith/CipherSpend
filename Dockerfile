FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer-cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py crypto.py db.py ./
COPY .streamlit/ .streamlit/

# data/ holds the secret key + SQLite DB — mount as a volume so they
# survive container restarts and never end up baked into the image.
VOLUME ["/app/data"]

EXPOSE 8501

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8501/_stcore/health')"

CMD ["streamlit", "run", "app.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true"]
