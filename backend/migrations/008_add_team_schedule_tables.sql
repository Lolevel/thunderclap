-- Migration: Team Schedule & Scrim Planning
-- Created: 2025-11-20
-- Description: Schedule for own team (not imported teams), so no team_id needed

-- ============================================================
-- TEAM SCHEDULE TABLES
-- ============================================================

-- Availability weeks - NO team_id (it's for MY team)
CREATE TABLE availability_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, week_number)
);

-- Player availability - uses player names/roles, not player_id from DB
CREATE TABLE player_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES availability_weeks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    player_name VARCHAR(100) NOT NULL,  -- Just a name, not linked to players table
    role VARCHAR(20),  -- Optional role indicator

    -- Availability status
    status VARCHAR(20) NOT NULL,
    time_from TIME,  -- DEPRECATED - use time_ranges instead
    time_to TIME,    -- DEPRECATED - use time_ranges instead
    time_ranges JSONB,  -- Array of {from, to} objects for multiple time slots

    -- Metadata
    confidence VARCHAR(20) DEFAULT 'confirmed',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),

    UNIQUE(week_id, date, player_name),
    CHECK (status IN ('available', 'unavailable', 'tentative', 'all_day'))
);

-- Scrim blocks - NO team_id
CREATE TABLE scrim_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Opponent info
    opponent_name VARCHAR(100) NOT NULL,
    opponent_opgg_url TEXT,
    opponent_rating VARCHAR(50),
    contact_method VARCHAR(50),
    contact_details TEXT,

    -- Scrim details
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    num_games INTEGER DEFAULT 2,
    draft_mode VARCHAR(20) DEFAULT 'normal',

    -- Training
    training_goal TEXT,
    notes TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled',
    result VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (draft_mode IN ('normal', 'fearless')),
    CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

-- Team events - NO team_id
CREATE TABLE team_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    title VARCHAR(200) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    meeting_time TIME,

    -- Details
    description TEXT,
    location VARCHAR(200),

    -- Link to scrim if applicable
    scrim_block_id UUID REFERENCES scrim_blocks(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (event_type IN ('scrim', 'prime_league', 'custom'))
);

-- Scrim draft prep
CREATE TABLE scrim_draft_prep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrim_block_id UUID NOT NULL REFERENCES scrim_blocks(id) ON DELETE CASCADE,

    blue_bans INTEGER[],
    blue_picks INTEGER[],
    red_bans INTEGER[],
    red_picks INTEGER[],

    blue_notes TEXT,
    red_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(scrim_block_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_availability_weeks_dates ON availability_weeks(year, week_number);
CREATE INDEX idx_player_availability_week ON player_availability(week_id, date);
CREATE INDEX idx_player_availability_player ON player_availability(player_name);
CREATE INDEX idx_team_events_date ON team_events(event_date);
CREATE INDEX idx_team_events_type ON team_events(event_type, event_date);
CREATE INDEX idx_team_events_scrim ON team_events(scrim_block_id) WHERE scrim_block_id IS NOT NULL;
CREATE INDEX idx_scrim_blocks_date ON scrim_blocks(scheduled_date);
CREATE INDEX idx_scrim_blocks_status ON scrim_blocks(status, scheduled_date);
CREATE INDEX idx_scrim_draft_prep_scrim ON scrim_draft_prep(scrim_block_id);

-- ============================================================
-- MIGRATION TRACKING
-- ============================================================

INSERT INTO schema_migrations (migration_name) VALUES ('008_add_team_schedule_tables');
