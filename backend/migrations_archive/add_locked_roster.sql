-- Migration: Add locked_roster column to teams table if it doesn't exist
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'teams'
        AND column_name = 'locked_roster'
    ) THEN
        ALTER TABLE teams ADD COLUMN locked_roster JSONB;
        RAISE NOTICE 'Added locked_roster column to teams table';
    ELSE
        RAISE NOTICE 'locked_roster column already exists in teams table';
    END IF;
END $$;
