-- Migration 007: Remove old rank columns from players table
-- Date: 2025-01-19
-- Description: Removes deprecated rank columns (current_rank, current_lp, peak_rank)
--              These have been replaced by soloq_* and flexq_* columns

-- Remove old rank columns
ALTER TABLE players
    DROP COLUMN IF EXISTS current_rank,
    DROP COLUMN IF EXISTS current_lp,
    DROP COLUMN IF EXISTS peak_rank;

-- Add comment to track migration
COMMENT ON TABLE players IS 'Player data with separate Solo/Duo and Flex queue rankings (updated 2025-01-19)';
