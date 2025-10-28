#!/usr/bin/env python3
"""
Intelligentes Auto-Migration Script für Thunderclap
Vergleicht Schema mit DB und führt automatisch Migrations aus
"""
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate, init, migrate, upgrade, stamp
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

def create_app_for_migration():
    """Create minimal Flask app for migrations"""
    app = Flask(__name__)

    # Database configuration
    database_url = os.getenv('DATABASE_URL', 'postgresql://pl_scout_user:pl_scout_password@postgres:5432/pl_scout')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    return app

def setup_migrations():
    """Initialize Flask-Migrate if not already initialized"""
    migrations_dir = Path(__file__).parent / 'migrations'

    if not migrations_dir.exists():
        print("🔧 Initializing Flask-Migrate for the first time...")
        from app import create_app, db

        app = create_app()
        Migrate(app, db)

        with app.app_context():
            init()
            print("✅ Flask-Migrate initialized")

            # Stamp current state
            stamp()
            print("✅ Database stamped with current state")

        return True

    return False

def run_auto_migration():
    """Run automatic migration"""
    print("🚀 Starting automatic database migration...")
    print("="*60)

    # Import app and db
    try:
        from app import create_app, db
    except ImportError as e:
        print(f"❌ Failed to import app: {e}")
        print("⚠️  Make sure you're running this from the backend directory")
        sys.exit(1)

    # Create Flask app
    app = create_app()
    Migrate(app, db)

    # Setup migrations if needed
    setup_migrations()

    with app.app_context():
        try:
            # Auto-generate migration if there are changes
            print("\n📊 Checking for database schema changes...")

            # Generate migration
            from flask_migrate import migrate as flask_migrate
            result = flask_migrate(message='Auto-generated migration')

            if result:
                print("✅ Migration file generated")
            else:
                print("ℹ️  No schema changes detected")

            # Apply migrations
            print("\n🔄 Applying pending migrations...")
            upgrade()
            print("✅ All migrations applied successfully")

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            sys.exit(1)

    print("\n" + "="*60)
    print("✅ Database migration completed successfully!")
    print("="*60)

if __name__ == '__main__':
    run_auto_migration()
