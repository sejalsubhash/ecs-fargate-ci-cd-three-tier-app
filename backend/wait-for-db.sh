#!/bin/sh
# Wait for MySQL to be ready before starting the Node.js server

HOST=${DB_HOST:-db}
PORT=${DB_PORT:-3306}
MAX_RETRIES=30
RETRY_INTERVAL=3

echo "Waiting for MySQL at $HOST:$PORT..."

i=1
while [ $i -le $MAX_RETRIES ]; do
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "MySQL is ready after $i attempt(s). Starting server..."
    exec node server.js
  fi
  echo "Attempt $i/$MAX_RETRIES — MySQL not ready yet. Retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
  i=$((i + 1))
done

echo "ERROR: MySQL did not become ready after $MAX_RETRIES attempts. Exiting."
exit 1