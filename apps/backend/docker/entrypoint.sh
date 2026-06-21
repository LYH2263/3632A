#!/bin/sh
set -eu

echo "Waiting for MySQL at ${MYSQL_HOST:-mysql}:${MYSQL_PORT:-3306}..."
python - <<'PY'
import os
import socket
import time

host = os.getenv("MYSQL_HOST", "mysql")
port = int(os.getenv("MYSQL_PORT", "3306"))

for attempt in range(180):
    try:
        with socket.create_connection((host, port), 2):
            print(f"MySQL is reachable at {host}:{port}")
            break
    except OSError:
        time.sleep(2)
else:
    raise SystemExit(f"MySQL not reachable at {host}:{port}")
PY

python manage.py migrate
python manage.py seed_mvp_data
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
