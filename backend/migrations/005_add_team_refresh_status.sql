-- Migration 005: Add team_refresh_status table for tracking data refresh progress
-- Description: Adds status tracking for team data refresh operations including
--              automatic nightly refreshes and manual refresh triggers
-- Created: 2025-11-03

CREATE TABLE IF NOT EXISTS team_refresh_status (
    id SERIAL PRIMARY KEY,
    team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'idle',  -- idle, running, completed, failed
    phase VARCHAR(50),  -- collecting_matches, filtering_matches, fetching_matches, linking_data, calculating_stats, updating_ranks, player_details
    progress_percent INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_refresh_status_team_id ON team_refresh_status(team_id);
CREATE INDEX IF NOT EXISTS idx_team_refresh_status_status ON team_refresh_status(status);

-- Update timestamp on row update
CREATE OR REPLACE FUNCTION update_team_refresh_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_refresh_status_updated_at
BEFORE UPDATE ON team_refresh_status
FOR EACH ROW
EXECUTE FUNCTION update_team_refresh_status_updated_at();
