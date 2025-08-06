-- Migration: Remove redundant player capacity fields from games table
-- Date: 2025-08-06
-- Description: Remove both players_cap and player_cap fields since we now use game_settings.maxPlayers exclusively

-- First, drop the constraint that references players_cap
ALTER TABLE public.games 
DROP CONSTRAINT IF EXISTS check_current_players_within_cap;

-- Drop the constraint that references player_cap
ALTER TABLE public.games 
DROP CONSTRAINT IF EXISTS games_player_cap_check;

-- Drop the constraint that references players_cap directly
ALTER TABLE public.games 
DROP CONSTRAINT IF EXISTS games_players_cap_check;

-- Remove the players_cap column
ALTER TABLE public.games 
DROP COLUMN IF EXISTS players_cap;

-- Remove the player_cap column  
ALTER TABLE public.games 
DROP COLUMN IF EXISTS player_cap;

-- Add a new constraint that uses game_settings.maxPlayers instead
-- This ensures current_players doesn't exceed the maxPlayers setting in the JSON
ALTER TABLE public.games 
ADD CONSTRAINT check_current_players_within_game_settings_max 
CHECK (
  current_players <= COALESCE(
    CAST(game_settings->>'maxPlayers' AS INTEGER), 
    50
  )
);

-- Add a constraint to ensure maxPlayers in game_settings is positive
ALTER TABLE public.games 
ADD CONSTRAINT check_game_settings_max_players_positive 
CHECK (
  CASE 
    WHEN game_settings->>'maxPlayers' IS NOT NULL 
    THEN CAST(game_settings->>'maxPlayers' AS INTEGER) > 0
    ELSE true
  END
);

-- Update any existing records to ensure they have maxPlayers in game_settings
-- This sets a default of 50 for any games that don't have maxPlayers defined
UPDATE public.games 
SET game_settings = COALESCE(game_settings, '{}'::jsonb) || '{"maxPlayers": 50}'::jsonb
WHERE game_settings->>'maxPlayers' IS NULL;

-- Add a comment to document the change
COMMENT ON TABLE public.games IS 'Game sessions table. Player capacity is managed through game_settings.maxPlayers field only.';
COMMENT ON COLUMN public.games.game_settings IS 'Game configuration including maxPlayers, autoAdvance, showExplanations, etc. maxPlayers field controls player capacity.';
COMMENT ON COLUMN public.games.current_players IS 'Current number of players in the game. Must not exceed game_settings.maxPlayers.';
