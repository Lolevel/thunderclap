-- Add prime_league_url column to teams table
-- Migration: 006_add_prime_league_url
-- Date: 2025-01-29

ALTER TABLE teams ADD COLUMN IF NOT EXISTS prime_league_url TEXT;

COMMENT ON COLUMN teams.prime_league_url IS 'PrimeLeague team page URL';
