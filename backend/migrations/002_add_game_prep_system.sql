-- Migration: 002_add_game_prep_system
-- Date: 2025-10-28
-- Description: Add Game Preparation System tables (rosters, scenarios, comments)

-- This is a copy of game_prep_schema.sql for migration tracking purposes
-- The actual tables may already exist, hence using IF NOT EXISTS

-- ============================================================
-- 1. GAME PREP ROSTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS game_prep_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., "Krugs", "Raptors", "Wolves"

    -- Roster composition (5 players with roles)
    roster JSONB NOT NULL,  -- [{"player_id": "uuid", "role": "TOP", "summoner_name": "..."}, ...]

    -- Lock status
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    locked_by VARCHAR(100),  -- Username who locked

    -- Metadata
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT roster_has_5_players CHECK (jsonb_array_length(roster) = 5)
);

-- ============================================================
-- 2. DRAFT SCENARIOS (NEW VERSION)
-- ============================================================
CREATE TABLE IF NOT EXISTS draft_scenarios_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    roster_id UUID REFERENCES game_prep_rosters(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,  -- e.g., "Baron", "Drake", "Gromp"

    -- Draft data
    side VARCHAR(10) NOT NULL CHECK (side IN ('blue', 'red')),

    -- Bans (horizontal arrays)
    blue_bans JSONB DEFAULT '[]',  -- [{"champion_id": 1, "order": 1}, ...]
    red_bans JSONB DEFAULT '[]',

    -- Picks (vertical arrays)
    blue_picks JSONB DEFAULT '[]',  -- [{"champion_id": 1, "role": "TOP", "player_id": "uuid"}, ...]
    red_picks JSONB DEFAULT '[]',

    -- Metadata
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. COMMENTS (3 Levels)
-- ============================================================
CREATE TABLE IF NOT EXISTS game_prep_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    -- Comment level (determines scope)
    level VARCHAR(20) NOT NULL CHECK (level IN ('global', 'roster', 'scenario')),

    -- References (NULL for global comments)
    roster_id UUID REFERENCES game_prep_rosters(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES draft_scenarios_new(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,
    author VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints: Enforce correct references per level
    CONSTRAINT global_comment_no_refs CHECK (
        (level = 'global' AND roster_id IS NULL AND scenario_id IS NULL) OR
        (level != 'global')
    ),
    CONSTRAINT roster_comment_has_roster CHECK (
        (level = 'roster' AND roster_id IS NOT NULL AND scenario_id IS NULL) OR
        (level != 'roster')
    ),
    CONSTRAINT scenario_comment_has_scenario CHECK (
        (level = 'scenario' AND scenario_id IS NOT NULL) OR
        (level != 'scenario')
    )
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Rosters
CREATE INDEX IF NOT EXISTS idx_game_prep_rosters_team
ON game_prep_rosters(team_id, display_order);

CREATE INDEX IF NOT EXISTS idx_game_prep_rosters_locked
ON game_prep_rosters(team_id, is_locked)
WHERE is_locked = true;

-- Scenarios
CREATE INDEX IF NOT EXISTS idx_draft_scenarios_new_team
ON draft_scenarios_new(team_id, roster_id, display_order);

CREATE INDEX IF NOT EXISTS idx_draft_scenarios_new_roster
ON draft_scenarios_new(roster_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_game_prep_comments_team
ON game_prep_comments(team_id, level);

CREATE INDEX IF NOT EXISTS idx_game_prep_comments_roster
ON game_prep_comments(roster_id)
WHERE roster_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_prep_comments_scenario
ON game_prep_comments(scenario_id)
WHERE scenario_id IS NOT NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✓ Game Prep System tables created/verified';
    RAISE NOTICE '✓ Tables: game_prep_rosters, draft_scenarios_new, game_prep_comments';
END $$;
