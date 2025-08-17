-- Migration: Fix game_results to game_players relationship
-- This migration adds the missing foreign key constraint between game_results and game_players tables

-- First, let's check if there are any orphaned records that would prevent the constraint
-- (This query is for information only, actual cleanup should be done carefully)

-- Check for orphaned game_results records
-- SELECT gr.id, gr.player_id FROM game_results gr 
-- LEFT JOIN game_players gp ON gr.player_id = gp.id 
-- WHERE gp.id IS NULL;

-- Add the missing foreign key constraint
-- Note: This assumes that game_results.player_id should reference game_players.id
-- If the relationship is different, adjust accordingly

ALTER TABLE public.game_results 
ADD CONSTRAINT game_results_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES public.game_players(id) 
ON DELETE CASCADE;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON public.game_results(player_id);

-- Verify the constraint was added
-- SELECT conname, conrelid::regclass, confrelid::regclass 
-- FROM pg_constraint 
-- WHERE conname = 'game_results_player_id_fkey';
