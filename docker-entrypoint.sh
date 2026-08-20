#!/bin/sh
set -e

echo "📦 Checking database connection and pushing schema..."

MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma db push --skip-generate; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Could not sync database after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "⏳ Database not ready yet, retrying in 2 seconds ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

echo "✅ Database schema synced! Launching Hayaku Note..."
exec "$@"
