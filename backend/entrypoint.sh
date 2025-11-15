#!/bin/bash
set -e

echo "🚀 Starting Thunderclap Backend..."
echo "=================================="

# Wait for database to be ready
echo ""
echo "⏳ Waiting for database..."
until python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')" 2>/dev/null; do
  echo "   Database not ready yet, retrying in 2 seconds..."
  sleep 2
done
echo "✅ Database is ready"

# Run automatic migrations
echo ""
echo "🔄 Running automatic database migrations..."
python auto_migrate.py

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migrations failed, exiting..."
  exit 1
fi

# Start the application
echo ""
echo "▶️  Starting application..."
echo "=================================="

# Check if we're in development or production
if [ "$FLASK_ENV" = "development" ]; then
  echo "🔧 Development mode: Using Flask dev server"
  exec python run.py
else
  echo "🚀 Production mode: Using Gunicorn with eventlet for WebSocket support"
  # Use eventlet worker for WebSocket support
  # Increased timeout to 300s (5min) for long-running refresh operations
  # Reduced workers to 2 to save memory
  exec gunicorn --bind 0.0.0.0:5000 \
    --workers 2 \
    --worker-class eventlet \
    --timeout 300 \
    --graceful-timeout 30 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    'run:app'
fi
