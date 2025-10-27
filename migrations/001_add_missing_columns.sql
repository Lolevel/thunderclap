-- Migration: Add missing columns to existing database
-- Safe to run multiple times (idempotent)
-- Run this BEFORE deploying new code

BEGIN;

-- Add locked_roster to teams if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'teams' AND column_name = 'locked_roster'
    ) THEN
        ALTER TABLE teams ADD COLUMN locked_roster JSONB;
        RAISE NOTICE 'Added locked_roster to teams';
    ELSE
        RAISE NOTICE 'locked_roster already exists in teams';
    END IF;
END $$;

-- Add any other missing columns here
-- Example:
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.columns
--         WHERE table_name = 'draft_scenarios' AND column_name = 'notes'
--     ) THEN
--         ALTER TABLE draft_scenarios ADD COLUMN notes TEXT;
--         RAISE NOTICE 'Added notes to draft_scenarios';
--     END IF;
-- END $$;

COMMIT;

-- Verify changes
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('teams', 'draft_scenarios')
ORDER BY table_name, ordinal_position;
