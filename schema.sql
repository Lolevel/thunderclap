-- Prime League Scout Database Schema
-- PostgreSQL 15+
-- Last Updated: 2025-10-29
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tag VARCHAR(10),
    prime_league_id VARCHAR(50) UNIQUE,
    prime_league_url TEXT,
    opgg_url TEXT,
    division VARCHAR(50),
    current_split VARCHAR(20),
    logo_url TEXT,
    locked_roster JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Players table (UPDATED: Added soloq/flexq columns)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summoner_name VARCHAR(100) NOT NULL,
    summoner_id VARCHAR(100) UNIQUE,
    puuid VARCHAR(100) UNIQUE NOT NULL,
    profile_icon_id INTEGER,
    current_rank VARCHAR(20),
    current_lp INTEGER,
    peak_rank VARCHAR(20),
    
    -- Solo/Duo Queue rank
    soloq_tier VARCHAR(20),
    soloq_division VARCHAR(5),
    soloq_lp INTEGER DEFAULT 0,
    soloq_wins INTEGER DEFAULT 0,
    soloq_losses INTEGER DEFAULT 0,
    
    -- Flex Queue rank
    flexq_tier VARCHAR(20),
    flexq_division VARCHAR(5),
    flexq_lp INTEGER DEFAULT 0,
    flexq_wins INTEGER DEFAULT 0,
    flexq_losses INTEGER DEFAULT 0,
    
    rank_last_updated TIMESTAMP,
    region VARCHAR(10) DEFAULT 'EUW1',
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team rosters (many-to-many with roles)
CREATE TABLE team_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    role VARCHAR(20),
    is_main_roster BOOLEAN DEFAULT true,
    join_date DATE,
    leave_date DATE,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, player_id, join_date)
);

-- Player champion statistics
CREATE TABLE player_champions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50),
    game_type VARCHAR(20) NOT NULL,
    mastery_level INTEGER,
    mastery_points INTEGER,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    winrate DECIMAL(5, 2),
    kda_average DECIMAL(4, 2),
    cs_per_min DECIMAL(4, 2),
    pink_wards_per_game DECIMAL(4, 2),
    last_played TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, champion_id, game_type)
);

-- Champions table (NEW)
CREATE TABLE champions (
    id INTEGER PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200),
    roles TEXT[],
    icon_url VARCHAR(500),
    splash_url VARCHAR(500),
    loading_url VARCHAR(500),
    patch_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MATCH DATA TABLES
-- ============================================================

-- Matches table (UPDATED: Added new columns)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id VARCHAR(50) UNIQUE NOT NULL,
    game_creation BIGINT,
    game_duration INTEGER,
    game_version VARCHAR(20),
    map_id INTEGER,
    queue_id INTEGER,
    platform_id VARCHAR(10) DEFAULT 'EUW1',
    is_tournament_game BOOLEAN DEFAULT false,
    tournament_name VARCHAR(100),
    tournament_code VARCHAR(100),
    game_ended_in_surrender BOOLEAN DEFAULT false,
    game_ended_in_early_surrender BOOLEAN DEFAULT false,
    winning_team_id UUID REFERENCES teams(id),
    losing_team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Match participants (UPDATED: Significantly expanded)
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    team_id UUID REFERENCES teams(id),
    
    -- Identity
    puuid VARCHAR(100) NOT NULL,
    summoner_name VARCHAR(100),
    riot_game_name VARCHAR(50),
    riot_tagline VARCHAR(10),
    
    -- Champion & Position
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50),
    team_position VARCHAR(20),
    individual_position VARCHAR(20),
    lane VARCHAR(20),
    role VARCHAR(20),
    riot_team_id INTEGER NOT NULL,
    participant_id INTEGER,
    
    -- Core stats
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    
    -- CS & Gold
    total_minions_killed INTEGER DEFAULT 0,
    neutral_minions_killed INTEGER DEFAULT 0,
    cs_total INTEGER,
    cs_per_min DECIMAL(5, 2),
    gold_earned INTEGER DEFAULT 0,
    gold_spent INTEGER DEFAULT 0,
    
    -- Damage
    total_damage_dealt_to_champions INTEGER DEFAULT 0,
    physical_damage_dealt_to_champions INTEGER DEFAULT 0,
    magic_damage_dealt_to_champions INTEGER DEFAULT 0,
    true_damage_dealt_to_champions INTEGER DEFAULT 0,
    total_damage_taken INTEGER DEFAULT 0,
    damage_self_mitigated INTEGER DEFAULT 0,
    
    -- Vision
    vision_score INTEGER DEFAULT 0,
    wards_placed INTEGER DEFAULT 0,
    wards_killed INTEGER DEFAULT 0,
    control_wards_placed INTEGER DEFAULT 0,
    vision_score_per_min DECIMAL(5, 2),
    
    -- Combat achievements
    first_blood BOOLEAN DEFAULT false,
    first_blood_assist BOOLEAN DEFAULT false,
    first_tower BOOLEAN DEFAULT false,
    first_tower_assist BOOLEAN DEFAULT false,
    double_kills INTEGER DEFAULT 0,
    triple_kills INTEGER DEFAULT 0,
    quadra_kills INTEGER DEFAULT 0,
    penta_kills INTEGER DEFAULT 0,
    largest_killing_spree INTEGER DEFAULT 0,
    largest_multi_kill INTEGER DEFAULT 0,
    
    -- Objectives
    baron_kills INTEGER DEFAULT 0,
    dragon_kills INTEGER DEFAULT 0,
    turret_kills INTEGER DEFAULT 0,
    inhibitor_kills INTEGER DEFAULT 0,
    
    -- Items
    item0 INTEGER,
    item1 INTEGER,
    item2 INTEGER,
    item3 INTEGER,
    item4 INTEGER,
    item5 INTEGER,
    item6 INTEGER,
    items_purchased INTEGER DEFAULT 0,
    
    -- Summoner spells
    summoner1_id INTEGER,
    summoner2_id INTEGER,
    summoner1_casts INTEGER DEFAULT 0,
    summoner2_casts INTEGER DEFAULT 0,
    
    -- Spell casts
    spell1_casts INTEGER DEFAULT 0,
    spell2_casts INTEGER DEFAULT 0,
    spell3_casts INTEGER DEFAULT 0,
    spell4_casts INTEGER DEFAULT 0,
    
    -- Runes
    perks JSONB,
    
    -- Advanced stats
    kda DECIMAL(5, 2),
    kill_participation DECIMAL(5, 4),
    damage_per_minute DECIMAL(7, 2),
    gold_per_minute DECIMAL(6, 2),
    team_damage_percentage DECIMAL(5, 4),
    solo_kills INTEGER DEFAULT 0,
    time_ccing_others INTEGER DEFAULT 0,
    
    -- Result
    win BOOLEAN NOT NULL,
    team_early_surrendered BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, puuid)
);

-- Match timeline data
CREATE TABLE match_timeline_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
    gold_diff_at_10 INTEGER,
    gold_diff_at_15 INTEGER,
    xp_diff_at_10 INTEGER,
    xp_diff_at_15 INTEGER,
    first_blood_time INTEGER,
    first_tower_time INTEGER,
    first_dragon_time INTEGER,
    first_herald_time INTEGER,
    timeline_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Match team stats (NEW)
CREATE TABLE match_team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    riot_team_id INTEGER NOT NULL,
    team_id UUID REFERENCES teams(id),
    win BOOLEAN NOT NULL,
    
    -- Objectives
    baron_kills INTEGER DEFAULT 0,
    dragon_kills INTEGER DEFAULT 0,
    herald_kills INTEGER DEFAULT 0,
    tower_kills INTEGER DEFAULT 0,
    inhibitor_kills INTEGER DEFAULT 0,
    atakhan_kills INTEGER DEFAULT 0,
    horde_kills INTEGER DEFAULT 0,
    
    -- First objectives
    first_baron BOOLEAN DEFAULT false,
    first_dragon BOOLEAN DEFAULT false,
    first_herald BOOLEAN DEFAULT false,
    first_tower BOOLEAN DEFAULT false,
    first_blood BOOLEAN DEFAULT false,
    first_inhibitor BOOLEAN DEFAULT false,
    first_atakhan BOOLEAN DEFAULT false,
    first_horde BOOLEAN DEFAULT false,
    
    -- Bans
    bans JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, riot_team_id)
);

-- ============================================================
-- STATISTICS & ANALYSIS TABLES
-- ============================================================

-- Team statistics (aggregated)
CREATE TABLE team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    stat_type VARCHAR(50),
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    first_blood_rate DECIMAL(5, 2),
    first_tower_rate DECIMAL(5, 2),
    first_dragon_rate DECIMAL(5, 2),
    dragon_control_rate DECIMAL(5, 2),
    baron_control_rate DECIMAL(5, 2),
    average_game_duration INTEGER,
    average_gold_diff_at_10 INTEGER,
    average_gold_diff_at_15 INTEGER,
    comeback_win_rate DECIMAL(5, 2),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, stat_type)
);

-- Draft patterns (ban/pick tendencies)
CREATE TABLE draft_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50),
    action_type VARCHAR(20),
    ban_rotation INTEGER,
    is_first_pick BOOLEAN DEFAULT false,
    pick_order INTEGER,
    side VARCHAR(10),
    frequency INTEGER DEFAULT 1,
    winrate DECIMAL(5, 2),
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Player performance timeline (daily aggregates)
CREATE TABLE player_performance_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    games_played INTEGER DEFAULT 0,
    average_kda DECIMAL(4, 2),
    average_cs_per_min DECIMAL(4, 2),
    average_vision_score DECIMAL(5, 2),
    winrate DECIMAL(5, 2),
    main_role VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, date)
);

-- ============================================================
-- PREDICTION & SCOUTING TABLES
-- ============================================================

-- Lineup predictions
CREATE TABLE lineup_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    match_date DATE,
    predicted_top UUID REFERENCES players(id),
    predicted_jungle UUID REFERENCES players(id),
    predicted_mid UUID REFERENCES players(id),
    predicted_adc UUID REFERENCES players(id),
    predicted_support UUID REFERENCES players(id),
    confidence_score DECIMAL(5, 2),
    prediction_factors JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scouting reports
CREATE TABLE scouting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    opponent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    match_date DATE,
    report_data JSONB,
    key_threats TEXT[],
    suggested_bans VARCHAR(50)[],
    win_conditions TEXT[],
    created_by UUID REFERENCES players(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Draft scenarios
CREATE TABLE draft_scenarios (
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
-- AUTHENTICATION TABLES
-- ============================================================

CREATE TABLE access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(100),
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP,
    use_count INTEGER DEFAULT 0
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Player lookups
CREATE INDEX idx_players_summoner_name ON players(summoner_name);
CREATE INDEX idx_players_puuid ON players(puuid);
CREATE INDEX idx_players_summoner_id ON players(summoner_id);

-- Match queries
CREATE INDEX idx_matches_game_creation ON matches(game_creation DESC);
CREATE INDEX idx_matches_tournament ON matches(is_tournament_game, game_creation DESC);
CREATE INDEX idx_matches_queue_id ON matches(queue_id);
CREATE INDEX idx_match_participants_player ON match_participants(player_id, match_id);
CREATE INDEX idx_match_participants_team ON match_participants(team_id, match_id);
CREATE INDEX idx_match_participants_puuid ON match_participants(puuid);

-- Team statistics
CREATE INDEX idx_team_rosters_active ON team_rosters(team_id, is_main_roster)
WHERE leave_date IS NULL;
CREATE INDEX idx_team_rosters_player ON team_rosters(player_id);
CREATE INDEX idx_draft_patterns_team ON draft_patterns(team_id, action_type, frequency DESC);
CREATE INDEX idx_team_stats_team ON team_stats(team_id, stat_type);

-- Performance tracking
CREATE INDEX idx_player_champions_mastery ON player_champions(player_id, mastery_points DESC);
CREATE INDEX idx_performance_timeline ON player_performance_timeline(player_id, date DESC);

-- Timeline data
CREATE INDEX idx_match_timeline_match ON match_timeline_data(match_id);

-- Predictions & Reports
CREATE INDEX idx_lineup_predictions_team ON lineup_predictions(team_id, match_date DESC);
CREATE INDEX idx_scouting_reports_opponent ON scouting_reports(opponent_team_id, match_date DESC);

-- Draft scenarios
CREATE INDEX idx_draft_scenarios_team ON draft_scenarios(team_id, side, display_order);
CREATE INDEX idx_draft_scenarios_active ON draft_scenarios(team_id, is_active) WHERE is_active = true;

-- ============================================================
-- GAME PREPARATION SYSTEM (Phase-based)
-- ============================================================

-- Game Prep Rosters (3 sets: Krugs, Raptors, Wolves)
CREATE TABLE IF NOT EXISTS game_prep_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., "Krugs", "Raptors", "Wolves"
    roster JSONB NOT NULL,  -- [{"player_id": "uuid", "role": "TOP", "summoner_name": "..."}, ...]
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    locked_by VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT roster_has_5_players CHECK (jsonb_array_length(roster) = 5)
);

-- Draft Scenarios (New version for Game Prep)
CREATE TABLE IF NOT EXISTS draft_scenarios_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    roster_id UUID REFERENCES game_prep_rosters(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., "Baron", "Drake", "Gromp"
    side VARCHAR(10) NOT NULL CHECK (side IN ('blue', 'red')),
    blue_bans JSONB DEFAULT '[]',
    red_bans JSONB DEFAULT '[]',
    blue_picks JSONB DEFAULT '[]',
    red_picks JSONB DEFAULT '[]',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game Prep Comments (3 levels: global, roster, scenario)
CREATE TABLE IF NOT EXISTS game_prep_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL CHECK (level IN ('global', 'roster', 'scenario')),
    roster_id UUID REFERENCES game_prep_rosters(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES draft_scenarios_new(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT global_comment_no_refs CHECK (
        (level = 'global' AND roster_id IS NULL AND scenario_id IS NULL) OR (level != 'global')
    ),
    CONSTRAINT roster_comment_has_roster CHECK (
        (level = 'roster' AND roster_id IS NOT NULL AND scenario_id IS NULL) OR (level != 'roster')
    ),
    CONSTRAINT scenario_comment_has_scenario CHECK (
        (level = 'scenario' AND scenario_id IS NOT NULL) OR (level != 'scenario')
    )
);

-- ============================================================
-- MIGRATION TRACKING
-- ============================================================

-- Schema migrations tracking table (used by auto_migrate.py)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ADDITIONAL INDEXES FOR GAME PREP
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_game_prep_rosters_team ON game_prep_rosters(team_id, display_order);
CREATE INDEX IF NOT EXISTS idx_game_prep_rosters_locked ON game_prep_rosters(team_id, is_locked) WHERE is_locked = true;
CREATE INDEX IF NOT EXISTS idx_draft_scenarios_new_team ON draft_scenarios_new(team_id, roster_id, display_order);
CREATE INDEX IF NOT EXISTS idx_draft_scenarios_new_roster ON draft_scenarios_new(roster_id);
CREATE INDEX IF NOT EXISTS idx_game_prep_comments_team ON game_prep_comments(team_id, level);
CREATE INDEX IF NOT EXISTS idx_game_prep_comments_roster ON game_prep_comments(roster_id) WHERE roster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_prep_comments_scenario ON game_prep_comments(scenario_id) WHERE scenario_id IS NOT NULL;