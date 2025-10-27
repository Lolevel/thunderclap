#!/usr/bin/env python3
"""
Database Migration Script
Runs all pending migrations from the migrations/ folder
"""
import os
import sys
import psycopg2
from pathlib import Path

def get_db_connection():
    """Get database connection from environment"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        sys.exit(1)

    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

def run_migration(conn, migration_file):
    """Run a single migration file"""
    print(f"\n📝 Running migration: {migration_file.name}")

    try:
        with open(migration_file, 'r') as f:
            sql = f.read()

        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()

        print(f"✅ Migration {migration_file.name} completed successfully")
        return True
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration {migration_file.name} failed: {e}")
        return False

def main():
    """Main migration runner"""
    print("🚀 Starting database migrations...")

    # Get database connection
    conn = get_db_connection()

    # Find all migration files
    migrations_dir = Path(__file__).parent / 'migrations'
    if not migrations_dir.exists():
        print("⚠️  No migrations directory found")
        return

    migration_files = sorted(migrations_dir.glob('*.sql'))

    if not migration_files:
        print("ℹ️  No migration files found")
        return

    print(f"📂 Found {len(migration_files)} migration file(s)")

    # Run each migration
    success_count = 0
    for migration_file in migration_files:
        if run_migration(conn, migration_file):
            success_count += 1

    conn.close()

    # Summary
    print(f"\n{'='*50}")
    print(f"✅ Completed {success_count}/{len(migration_files)} migrations")
    print(f"{'='*50}\n")

    if success_count < len(migration_files):
        sys.exit(1)

if __name__ == '__main__':
    main()
