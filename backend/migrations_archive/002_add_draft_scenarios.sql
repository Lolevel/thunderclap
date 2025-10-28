-- Migration: Add Draft Scenarios table for Game Preparation feature
-- Version: 002
-- Description: Creates draft_scenarios table if it doesn't exist
-- Can be run safely on existing databases (idempotent)

-- ============================================================
-- CREATE DRAFT SCENARIOS TABLE
-- ============================================================

-- Create draft_scenarios table if it doesn't exist
CREATE TABLE IF NOT EXISTS draft_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    scenario_name VARCHAR(255) DEFAULT 'Scenario 1',
    side VARCHAR(10) NOT NULL,
    roster JSONB,
    bans JSONB,
    picks JSONB,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CREATE INDEXES
-- ============================================================

-- Index for efficient team queries
CREATE INDEX IF NOT EXISTS idx_draft_scenarios_team
ON draft_scenarios(team_id, side, display_order);

-- Index for active scenarios
CREATE INDEX IF NOT EXISTS idx_draft_scenarios_active
ON draft_scenarios(team_id, is_active)
WHERE is_active = true;

-- ============================================================
-- VERIFY MIGRATION
-- ============================================================

-- Display table info
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'draft_scenarios'
    ) INTO table_exists;

    IF table_exists THEN
        -- Get row count
        SELECT COUNT(*) INTO row_count FROM draft_scenarios;

        RAISE NOTICE '✓ Migration completed successfully';
        RAISE NOTICE '✓ Table draft_scenarios exists';
        RAISE NOTICE '✓ Current row count: %', row_count;
        RAISE NOTICE '✓ Indexes created';
    ELSE
        RAISE EXCEPTION 'Migration failed: Table draft_scenarios does not exist';
    END IF;
END $$;
