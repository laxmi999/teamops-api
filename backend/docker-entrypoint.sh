#!/bin/sh
set -e

echo "Waiting for database and applying migrations..."

i=1
max=30
until npx prisma migrate deploy; do
  if [ "$i" -ge "$max" ]; then
    echo "Migrations failed after ${max} attempts."
    exit 1
  fi
  echo "Database not ready (attempt ${i}/${max}); retrying in 2s..."
  i=$((i + 1))
  sleep 2
done

echo "Starting TeamOps API..."
exec "$@"
