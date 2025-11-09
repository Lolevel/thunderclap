-- Migration 006: Add performance indexes for query optimization
-- Date: 2025-01-09
-- Purpose: Improve query performance for team stats and champion pools

-- Index for fast champion pool queries (team + champion stats)
CREATE INDEX IF NOT EXISTS idx_match_participants_team_champion
ON match_participants(team_id, champion_id)
WHERE team_id IS NOT NULL;

-- Index for fast player champion pool queries
CREATE INDEX IF NOT EXISTS idx_player_champions_player_type_games
ON player_champions(player_id, game_type, games_played DESC);

-- Index for fast recent match queries
CREATE INDEX IF NOT EXISTS idx_matches_creation_desc
ON matches(game_creation DESC);

-- Index for tournament match filtering with date range
CREATE INDEX IF NOT EXISTS idx_matches_tournament_created
ON matches(is_tournament_game, created_at DESC)
WHERE is_tournament_game = true;

-- Index for player match history queries
CREATE INDEX IF NOT EXISTS idx_match_participants_player_match
ON match_participants(player_id, match_id);

-- Composite index for team match participant queries
CREATE INDEX IF NOT EXISTS idx_match_participants_team_match_champ
ON match_participants(team_id, match_id, champion_id)
WHERE team_id IS NOT NULL;

-- Index for team stats lookup
CREATE INDEX IF NOT EXISTS idx_team_stats_team_type_unique
ON team_stats(team_id, stat_type);

COMMENT ON INDEX idx_match_participants_team_champion IS 'Optimizes team champion pool queries';
COMMENT ON INDEX idx_player_champions_player_type_games IS 'Optimizes player champion stats queries';
COMMENT ON INDEX idx_matches_creation_desc IS 'Optimizes recent matches queries';
COMMENT ON INDEX idx_matches_tournament_created IS 'Optimizes tournament match filtering';
COMMENT ON INDEX idx_match_participants_player_match IS 'Optimizes player match history';
COMMENT ON INDEX idx_match_participants_team_match_champ IS 'Optimizes team match analysis';
COMMENT ON INDEX idx_team_stats_team_type_unique IS 'Optimizes team stats lookup';
