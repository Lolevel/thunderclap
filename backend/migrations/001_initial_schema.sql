-- Initial Schema Migration
-- This is a placeholder for existing schema.sql baseline
-- All tables created by schema.sql are considered "already migrated" on fresh installs

-- This migration is intentionally empty and serves as a marker
-- If you're running on a fresh database, schema.sql creates all tables
-- If you're upgrading from an old database, this migration is skipped

DO $$
BEGIN
    RAISE NOTICE '✓ Initial schema baseline marker';
END $$;
