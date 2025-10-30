-- ============================================================
-- Migration: 005_game_prep_system_fixed
-- Date: 2025-10-30
-- Description: Clean slate migration for Game Prep System
-- Author: Fixed version with proper cleanup
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: DROP OLD TABLES (CASCADE to remove dependencies)
-- ============================================================
DO $$ 
BEGIN
    RAISE NOTICE '⚙️  Cleaning up old tables...';
    
    -- Drop in reverse dependency order
    DROP TABLE IF EXISTS game_prep_comments CASCADE;
    DROP TABLE IF EXISTS draft_scenarios CASCADE;
    DROP TABLE IF EXISTS draft_scenarios_new CASCADE;
    DROP TABLE IF EXISTS game_prep_rosters CASCADE;
    
    RAISE NOTICE '✓ Old tables dropped';
END $$;

-- ============================================================
-- STEP 2: CREATE TABLE - game_prep_rosters
-- ============================================================
CREATE TABLE game_prep_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    
    -- Roster info
    name VARCHAR(100) NOT NULL,
    roster JSONB NOT NULL,
    
    -- Lock status
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    locked_by VARCHAR(100),
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_game_prep_rosters_team 
        FOREIGN KEY (team_id) 
        REFERENCES teams(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT roster_has_5_players 
        CHECK (jsonb_array_length(roster) = 5)
);

DO $$ BEGIN RAISE NOTICE '✓ Created table: game_prep_rosters'; END $$;

-- ============================================================
-- STEP 3: CREATE TABLE - draft_scenarios
-- ============================================================
CREATE TABLE draft_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    roster_id UUID NOT NULL,
    
    -- Scenario info
    name VARCHAR(100) NOT NULL,
    side VARCHAR(10) NOT NULL,
    
    -- Draft data (bans)
    blue_bans JSONB DEFAULT '[]'::jsonb,
    red_bans JSONB DEFAULT '[]'::jsonb,
    
    -- Draft data (picks)
    blue_picks JSONB DEFAULT '[]'::jsonb,
    red_picks JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_draft_scenarios_team 
        FOREIGN KEY (team_id) 
        REFERENCES teams(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_draft_scenarios_roster 
        FOREIGN KEY (roster_id) 
        REFERENCES game_prep_rosters(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT side_check 
        CHECK (side IN ('blue', 'red'))
);

DO $$ BEGIN RAISE NOTICE '✓ Created table: draft_scenarios'; END $$;

-- ============================================================
-- STEP 4: CREATE TABLE - game_prep_comments
-- ============================================================
CREATE TABLE game_prep_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    
    -- Comment level
    level VARCHAR(20) NOT NULL,
    
    -- References (nullable for different levels)
    roster_id UUID,
    scenario_id UUID,
    
    -- Content
    content TEXT NOT NULL,
    author VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_game_prep_comments_team 
        FOREIGN KEY (team_id) 
        REFERENCES teams(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_game_prep_comments_roster 
        FOREIGN KEY (roster_id) 
        REFERENCES game_prep_rosters(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_game_prep_comments_scenario 
        FOREIGN KEY (scenario_id) 
        REFERENCES draft_scenarios(id) 
        ON DELETE CASCADE,
    
    -- Constraints: Enforce correct references per level
    CONSTRAINT level_check 
        CHECK (level IN ('global', 'roster', 'scenario')),
    
    CONSTRAINT global_comment_no_refs 
        CHECK (
            (level = 'global' AND roster_id IS NULL AND scenario_id IS NULL) OR
            (level != 'global')
        ),
    
    CONSTRAINT roster_comment_has_roster 
        CHECK (
            (level = 'roster' AND roster_id IS NOT NULL AND scenario_id IS NULL) OR
            (level != 'roster')
        ),
    
    CONSTRAINT scenario_comment_has_scenario 
        CHECK (
            (level = 'scenario' AND scenario_id IS NOT NULL) OR
            (level != 'scenario')
        )
);

DO $$ BEGIN RAISE NOTICE '✓ Created table: game_prep_comments'; END $$;

-- ============================================================
-- STEP 5: CREATE INDEXES
-- ============================================================

-- Indexes for game_prep_rosters
CREATE INDEX idx_game_prep_rosters_team 
ON game_prep_rosters(team_id, display_order);

CREATE INDEX idx_game_prep_rosters_locked 
ON game_prep_rosters(team_id, is_locked) 
WHERE is_locked = true;

DO $$ BEGIN RAISE NOTICE '✓ Created indexes for game_prep_rosters'; END $$;

-- Indexes for draft_scenarios
CREATE INDEX idx_draft_scenarios_team 
ON draft_scenarios(team_id, roster_id, display_order);

CREATE INDEX idx_draft_scenarios_roster 
ON draft_scenarios(roster_id);

DO $$ BEGIN RAISE NOTICE '✓ Created indexes for draft_scenarios'; END $$;

-- Indexes for game_prep_comments
CREATE INDEX idx_game_prep_comments_team 
ON game_prep_comments(team_id, level);

CREATE INDEX idx_game_prep_comments_roster 
ON game_prep_comments(roster_id) 
WHERE roster_id IS NOT NULL;

CREATE INDEX idx_game_prep_comments_scenario 
ON game_prep_comments(scenario_id) 
WHERE scenario_id IS NOT NULL;

DO $$ BEGIN RAISE NOTICE '✓ Created indexes for game_prep_comments'; END $$;

-- ============================================================
-- STEP 6: VERIFICATION
-- ============================================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('game_prep_rosters', 'draft_scenarios', 'game_prep_comments');
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND (indexname LIKE 'idx_game_prep%' OR indexname LIKE 'idx_draft_scenarios%');
    
    RAISE NOTICE '';
    RAISE NOTICE '================================';
    RAISE NOTICE '✅ Migration 005 completed successfully';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE '';
    
    IF table_count = 3 THEN
        RAISE NOTICE '✓ All Game Prep System tables are ready';
        RAISE NOTICE '  - game_prep_rosters';
        RAISE NOTICE '  - draft_scenarios';
        RAISE NOTICE '  - game_prep_comments';
    ELSE
        RAISE WARNING '⚠ Expected 3 tables, found %', table_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 You can now use the Game Prep System!';
END $$;

COMMIT;

-- ============================================================
-- QUICK VERIFICATION QUERIES (run these after migration)
-- ============================================================
-- \dt game_prep*
-- \dt draft_scenarios
-- \d+ game_prep_rosters
-- \d+ draft_scenarios
-- \d+ game_prep_comments