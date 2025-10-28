-- Migration: Add roster fields to draft_scenarios and teams
-- Date: 2025-01-27

-- Add roster field to draft_scenarios
ALTER TABLE draft_scenarios
ADD COLUMN IF NOT EXISTS roster JSONB;

COMMENT ON COLUMN draft_scenarios.roster IS 'Array of 5 player objects for this scenario';

-- Add locked_roster field to teams
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS locked_roster JSONB;

COMMENT ON COLUMN teams.locked_roster IS 'Locked roster for draft prep (NULL if not locked)';

-- Update existing scenarios to have empty rosters
UPDATE draft_scenarios
SET roster = '[]'::jsonb
WHERE roster IS NULL;
