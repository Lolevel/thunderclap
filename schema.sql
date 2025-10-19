-- Prime League Scout Database Schema
-- PostgreSQL 15+
-- Last Updated: 2024
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
    opgg_url TEXT,
    division VARCHAR(50),
    current_split VARCHAR(20),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summoner_name VARCHAR(100) NOT NULL,
    summoner_id VARCHAR(100) UNIQUE,
    -- Nullable due to Riot API bug (Issue #1092, Aug 2025)
    puuid VARCHAR(100) UNIQUE NOT NULL,
    summoner_level INTEGER,
    profile_icon_id INTEGER,
    current_rank VARCHAR(20),
    current_lp INTEGER,
    peak_rank VARCHAR(20),
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
    -- TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
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
    mastery_level INTEGER,
    mastery_points INTEGER,
    games_played_total INTEGER DEFAULT 0,
    games_played_recent INTEGER DEFAULT 0,
    -- last 30 days
    winrate_total DECIMAL(5, 2),
    winrate_recent DECIMAL(5, 2),
    kda_average DECIMAL(4, 2),
    cs_per_min DECIMAL(4, 2),
    last_played TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, champion_id)
);
-- ============================================================
-- MATCH DATA TABLES
-- ============================================================
-- Matches table
-- Note: is_scrim removed - scrims are never public via Riot API
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id VARCHAR(50) UNIQUE NOT NULL,
    game_creation BIGINT,
    game_duration INTEGER,
    game_version VARCHAR(20),
    map_id INTEGER,
    queue_id INTEGER,
    -- 0 for custom, 420 for ranked solo
    is_tournament_game BOOLEAN DEFAULT false,
    tournament_name VARCHAR(100),
    winning_team_id UUID REFERENCES teams(id),
    losing_team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW()
);
-- Match participants (individual player performance)
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    team_id UUID REFERENCES teams(id),
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50),
    role VARCHAR(20),
    lane VARCHAR(20),
    team_position VARCHAR(20),
    -- Riot's auto-detected position
    kills INTEGER,
    deaths INTEGER,
    assists INTEGER,
    cs_total INTEGER,
    cs_per_min DECIMAL(4, 2),
    gold_earned INTEGER,
    damage_dealt INTEGER,
    damage_taken INTEGER,
    vision_score INTEGER,
    wards_placed INTEGER,
    wards_destroyed INTEGER,
    first_blood BOOLEAN,
    first_tower BOOLEAN,
    win BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);
-- Match timeline data (cached from Riot API)
-- Only store for last 10 tournament games per team
CREATE TABLE match_timeline_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
    gold_diff_at_10 INTEGER,
    gold_diff_at_15 INTEGER,
    xp_diff_at_10 INTEGER,
    xp_diff_at_15 INTEGER,
    first_blood_time INTEGER,
    -- seconds into game
    first_tower_time INTEGER,
    first_dragon_time INTEGER,
    first_herald_time INTEGER,
    timeline_data JSONB,
    -- full timeline for advanced analysis
    created_at TIMESTAMP DEFAULT NOW()
);
-- ============================================================
-- STATISTICS & ANALYSIS TABLES
-- ============================================================
-- Team statistics (aggregated)
CREATE TABLE team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    stat_type VARCHAR(50),
    -- 'tournament', 'all'
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
    -- wins when behind at 15
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, stat_type)
);
-- Draft patterns (ban/pick tendencies)
CREATE TABLE draft_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    champion_id INTEGER NOT NULL,
    action_type VARCHAR(20),
    -- 'ban', 'pick'
    phase INTEGER,
    -- 1, 2, 3 for ban phases
    pick_order INTEGER,
    -- 1-5 for picks
    side VARCHAR(10),
    -- 'blue', 'red'
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
    -- detailed breakdown of prediction
    created_at TIMESTAMP DEFAULT NOW()
);
-- Scouting reports
CREATE TABLE scouting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    opponent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    match_date DATE,
    report_data JSONB,
    -- comprehensive report as JSON
    key_threats TEXT [],
    suggested_bans VARCHAR(50) [],
    win_conditions TEXT [],
    created_by UUID REFERENCES players(id),
    created_at TIMESTAMP DEFAULT NOW()
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
-- Team statistics
CREATE INDEX idx_team_rosters_active ON team_rosters(team_id, is_main_roster)
WHERE leave_date IS NULL;
CREATE INDEX idx_team_rosters_player ON team_rosters(player_id);
CREATE INDEX idx_draft_patterns_team ON draft_patterns(team_id, action_type, frequency DESC);
CREATE INDEX idx_team_stats_team ON team_stats(team_id, stat_type);
-- Performance tracking
CREATE INDEX idx_player_champions_recent ON player_champions(player_id, games_played_recent DESC);
CREATE INDEX idx_player_champions_mastery ON player_champions(player_id, mastery_points DESC);
CREATE INDEX idx_performance_timeline ON player_performance_timeline(player_id, date DESC);
-- Timeline data
CREATE INDEX idx_match_timeline_match ON match_timeline_data(match_id);
-- Predictions & Reports
CREATE INDEX idx_lineup_predictions_team ON lineup_predictions(team_id, match_date DESC);
CREATE INDEX idx_scouting_reports_opponent ON scouting_reports(opponent_team_id, match_date DESC);
-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE matches IS 'All custom games (queue_id=0) visible via API are tournament games - scrims are never public';
COMMENT ON TABLE match_timeline_data IS 'Only store timeline data for last 10 tournament games per team to respect API rate limits';
COMMENT ON COLUMN team_rosters.role IS 'Use Riot standard: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY (not SUPPORT)';
COMMENT ON COLUMN match_participants.team_position IS 'Riot auto-detected position - may differ from assigned role';
COMMENT ON TABLE lineup_predictions IS 'Prediction weights: 50% tournament history, 30% role coverage, 18% solo queue activity, 2% performance';