FROM ghcr.io/astral-sh/uv:0.11.3 AS uv

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/backend/.venv/bin:$PATH"

WORKDIR /app/backend

COPY --from=uv /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

COPY . ./

# Static files are immutable application assets. Database migrations deliberately
# run outside the image build, immediately before deployment.
RUN DEBUG=True \
    SECRET_KEY=build-only-secret-key \
    DATABASE_URL=sqlite:////tmp/build.sqlite3 \
    CACHE_URL=locmemcache://build-cache \
    uv run --no-sync manage.py collectstatic --noinput

RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Neon uses its pooled URL for application traffic. Run migrations through the
# optional direct URL instead, because Django schema migrations can require
# PostgreSQL session behavior that transaction pooling does not provide.
CMD ["sh", "-c", "DATABASE_URL=\"${MIGRATION_DATABASE_URL:-$DATABASE_URL}\" uv run --no-sync manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --threads ${GUNICORN_THREADS:-4} --timeout 60 --graceful-timeout 30 --access-logfile - --error-logfile -"]
