-- Migration Script: Update Schema for New Requirements
-- Date: 2025
-- Description: Adds support for separate tournament/soloqueue stats, pink wards, draft analysis improvements

-- ============================================================
-- 1. PLAYERS TABLE - Remove summoner_level
-- ============================================================
-- Note: If column exists, remove it. If not, this will error but it's safe to continue
ALTER TABLE players DROP COLUMN IF EXISTS summoner_level;

-- ============================================================
-- 2. PLAYER_CHAMPIONS TABLE - Major restructure
-- ============================================================
-- Backup existing data
CREATE TABLE IF NOT EXISTS player_champions_backup AS SELECT * FROM player_champions;

-- Drop old unique constraint
ALTER TABLE player_champions DROP CONSTRAINT IF EXISTS uq_player_champion;

-- Add new columns
ALTER TABLE player_champions ADD COLUMN IF NOT EXISTS game_type VARCHAR(20);
ALTER TABLE player_champions ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE player_champions ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE player_champions ADD COLUMN IF NOT EXISTS pink_wards_per_game DECIMAL(4, 2);

-- Rename old columns (if they exist)
ALTER TABLE player_champions RENAME COLUMN games_played_total TO games_played_old;
ALTER TABLE player_champions RENAME COLUMN winrate_total TO winrate_old;

-- Add new columns with correct names
ALTER TABLE player_champions ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
ALTER TABLE player_champions ADD COLUMN IF NOT EXISTS winrate DECIMAL(5, 2);

-- Migrate existing data to 'tournament' type
UPDATE player_champions
SET game_type = 'tournament',
    games_played = COALESCE(games_played_old, 0),
    winrate = COALESCE(winrate_old, 0),
    wins = ROUND(COALESCE(games_played_old, 0) * COALESCE(winrate_old, 0) / 100.0),
    losses = COALESCE(games_played_old, 0) - ROUND(COALESCE(games_played_old, 0) * COALESCE(winrate_old, 0) / 100.0)
WHERE game_type IS NULL;

-- Drop old columns
ALTER TABLE player_champions DROP COLUMN IF EXISTS games_played_old;
ALTER TABLE player_champions DROP COLUMN IF EXISTS games_played_recent;
ALTER TABLE player_champions DROP COLUMN IF EXISTS winrate_old;
ALTER TABLE player_champions DROP COLUMN IF EXISTS winrate_recent;

-- Make game_type NOT NULL
ALTER TABLE player_champions ALTER COLUMN game_type SET NOT NULL;

-- Add new unique constraint
ALTER TABLE player_champions ADD CONSTRAINT uq_player_champion_type UNIQUE (player_id, champion_id, game_type);

-- ============================================================
-- 3. MATCH_PARTICIPANTS TABLE - Add control_wards_placed
-- ============================================================
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS control_wards_placed INTEGER DEFAULT 0;

-- ============================================================
-- 4. DRAFT_PATTERNS TABLE - Add new columns
-- ============================================================
ALTER TABLE draft_patterns ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id);
ALTER TABLE draft_patterns ADD COLUMN IF NOT EXISTS champion_name VARCHAR(50);
ALTER TABLE draft_patterns ADD COLUMN IF NOT EXISTS ban_rotation INTEGER;
ALTER TABLE draft_patterns ADD COLUMN IF NOT EXISTS is_first_pick BOOLEAN DEFAULT false;

-- Rename old 'phase' column to 'ban_rotation' (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='draft_patterns' AND column_name='phase') THEN
        ALTER TABLE draft_patterns RENAME COLUMN phase TO ban_rotation_old;
        UPDATE draft_patterns SET ban_rotation = ban_rotation_old WHERE ban_rotation_old IS NOT NULL;
        ALTER TABLE draft_patterns DROP COLUMN ban_rotation_old;
    END IF;
END $$;

-- Update side column to support 'both'
-- (No migration needed, just allow new value)

-- ============================================================
-- 5. UPDATE COMMENTS
-- ============================================================
COMMENT ON COLUMN team_rosters.role IS 'Store as Riot values (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY) but display as Top, Jungle, Mid, Bot, Support';
COMMENT ON TABLE player_champions IS 'Two entries per champion: one for tournament games, one for solo queue. Solo Queue shows top 20 most played this season';
COMMENT ON COLUMN player_champions.pink_wards_per_game IS 'Control wards (pink wards) placed per game';
COMMENT ON COLUMN match_participants.control_wards_placed IS 'Control wards (pink wards) placed in this match';
COMMENT ON TABLE draft_patterns IS 'Tracks team ban priorities, bans against them, first pick priorities, and which player picked which champion';

-- ============================================================
-- VERIFICATION QUERIES (Optional - run to check migration)
-- ============================================================
-- Check players table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'players';

-- Check player_champions has game_type
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'player_champions';

-- Check draft_patterns new columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'draft_patterns';

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback player_champions:
-- DROP TABLE IF EXISTS player_champions CASCADE;
-- ALTER TABLE player_champions_backup RENAME TO player_champions;
-- Recreate constraints and indexes as needed
