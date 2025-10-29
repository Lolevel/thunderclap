#!/usr/bin/env python3
"""
SQL-based Auto-Migration System für Thunderclap
Führt SQL-Migrationen aus migrations/ Verzeichnis aus und tracked ausgeführte Migrationen
"""
import os
import sys
import psycopg2
from pathlib import Path
from datetime import datetime

def get_db_connection():
    """Create database connection from environment"""
    database_url = os.getenv('DATABASE_URL', 'postgresql://pl_scout_user:pl_scout_password@postgres:5432/pl_scout')

    # Parse DATABASE_URL
    # Format: postgresql://user:password@host:port/dbname
    if database_url.startswith('postgresql://'):
        url = database_url.replace('postgresql://', '')
        auth, location = url.split('@')
        user, password = auth.split(':')
        host_port, dbname = location.split('/')
        host, port = host_port.split(':') if ':' in host_port else (host_port, '5432')

        return psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname
        )
    else:
        raise ValueError(f"Invalid DATABASE_URL format: {database_url}")

def ensure_migrations_table(conn):
    """Create schema_migrations table if it doesn't exist"""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW()
            );
        """)
        conn.commit()
        print("✅ Migrations tracking table ready")

def get_executed_migrations(conn):
    """Get list of already executed migrations"""
    with conn.cursor() as cur:
        cur.execute("SELECT migration_name FROM schema_migrations ORDER BY executed_at;")
        return set(row[0] for row in cur.fetchall())

def get_pending_migrations(migrations_dir, executed_migrations):
    """Get list of pending SQL migrations"""
    if not migrations_dir.exists():
        return []

    # Find all .sql files
    all_migrations = sorted([
        f.name for f in migrations_dir.glob('*.sql')
        if not f.name.startswith('.')
    ])

    # Filter out already executed ones
    pending = [m for m in all_migrations if m not in executed_migrations]

    return pending

def execute_migration(conn, migration_path, migration_name):
    """Execute a single migration file"""
    print(f"\n📄 Executing: {migration_name}")

    try:
        # Read migration file
        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()

        # Execute migration
        with conn.cursor() as cur:
            cur.execute(sql)

            # Record migration as executed
            cur.execute(
                "INSERT INTO schema_migrations (migration_name) VALUES (%s);",
                (migration_name,)
            )

        conn.commit()
        print(f"   ✅ {migration_name} applied successfully")
        return True

    except Exception as e:
        conn.rollback()
        print(f"   ❌ Failed to apply {migration_name}: {e}")
        return False

def run_auto_migration():
    """Run automatic SQL migrations"""
    print("🚀 Starting automatic database migration...")
    print("=" * 60)

    try:
        # Connect to database
        print("\n📊 Connecting to database...")
        conn = get_db_connection()
        print("✅ Database connection established")

        # Ensure migrations tracking table exists
        ensure_migrations_table(conn)

        # Get executed migrations
        executed_migrations = get_executed_migrations(conn)
        if executed_migrations:
            print(f"\n📋 Already executed: {len(executed_migrations)} migration(s)")
            for m in sorted(executed_migrations):
                print(f"   ✓ {m}")
        else:
            print("\n📋 No migrations executed yet")

        # Find pending migrations
        # Check both root migrations/ and backend/migrations/
        root_migrations_dir = Path(__file__).parent.parent / 'migrations'
        backend_migrations_dir = Path(__file__).parent / 'migrations'

        all_pending = []

        # Collect from root migrations/
        if root_migrations_dir.exists():
            root_pending = get_pending_migrations(root_migrations_dir, executed_migrations)
            all_pending.extend([(root_migrations_dir / m, m) for m in root_pending])

        # Collect from backend/migrations/
        if backend_migrations_dir.exists():
            backend_pending = get_pending_migrations(backend_migrations_dir, executed_migrations)
            all_pending.extend([(backend_migrations_dir / m, m) for m in backend_pending])

        # Remove duplicates (prefer root migrations/)
        seen_names = set()
        unique_pending = []
        for path, name in sorted(all_pending, key=lambda x: x[1]):
            if name not in seen_names:
                unique_pending.append((path, name))
                seen_names.add(name)

        if not unique_pending:
            print("\n✅ No pending migrations found - database is up to date")
        else:
            print(f"\n🔄 Found {len(unique_pending)} pending migration(s):")
            for path, name in unique_pending:
                print(f"   • {name}")

            # Execute pending migrations in order
            print("\n🔄 Applying pending migrations...")
            success_count = 0
            for migration_path, migration_name in unique_pending:
                if execute_migration(conn, migration_path, migration_name):
                    success_count += 1
                else:
                    print(f"\n❌ Migration failed: {migration_name}")
                    print("⚠️  Stopping migration process")
                    conn.close()
                    sys.exit(1)

            print(f"\n✅ Successfully applied {success_count} migration(s)")

        # Close connection
        conn.close()

        print("\n" + "=" * 60)
        print("✅ Database migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Migration system error: {e}")
        print("⚠️  Continuing with application startup...")
        sys.exit(0)  # Don't fail startup, just warn

if __name__ == '__main__':
    run_auto_migration()
