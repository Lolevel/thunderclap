#!/bin/bash
set -e

echo "🚀 Starting Thunderclap Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')" 2>/dev/null; do
  echo "   Database not ready yet, waiting..."
  sleep 2
done
echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running database migrations..."
python migrate.py

# Start the application
echo "▶️  Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 --access-logfile - --error-logfile - run:app
