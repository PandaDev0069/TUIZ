-- Fix the foreign key constraint issue in game_results
-- The current constraint references game_players(id) but we might need more flexibility

-- First, let's check the current constraint
-- DROP CONSTRAINT IF EXISTS game_results_player_id_fkey;

-- Option 1: Keep the current constraint but add ON DELETE SET NULL to prevent orphaned records
ALTER TABLE public.game_results 
DROP CONSTRAINT IF EXISTS game_results_player_id_fkey;

ALTER TABLE public.game_results 
ADD CONSTRAINT game_results_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES public.game_players(id) ON DELETE SET NULL;

-- Add an index to improve performance
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON public.game_results(player_id);

-- Add a comment explaining the relationship
COMMENT ON CONSTRAINT game_results_player_id_fkey ON public.game_results IS 'References the specific game participation record (game_players.id), not the user ID';
