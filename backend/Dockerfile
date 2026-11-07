FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLTK_DATA=/opt/nltk_data \
    TIKTOKEN_CACHE_DIR=/opt/tiktoken

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

RUN mkdir -p "$NLTK_DATA" "$TIKTOKEN_CACHE_DIR" \
    && python -c "import nltk; nltk.download('punkt_tab', download_dir='/opt/nltk_data'); import tiktoken; tiktoken.get_encoding('cl100k_base')"

RUN --network=none python -c "import nltk; nltk.data.find('tokenizers/punkt_tab'); import tiktoken; tiktoken.get_encoding('cl100k_base')"

COPY backend/ /app/

RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app /opt/nltk_data /opt/tiktoken

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]