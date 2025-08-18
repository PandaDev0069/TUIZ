-- Disable the conflicting database trigger
-- We're handling game results creation manually in the application code
-- The trigger is causing foreign key constraint violations

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_create_game_results ON public.games;

-- Optionally, we can keep the function but not use it as a trigger
-- This allows for manual game results creation if needed later

-- Add a comment explaining why the trigger was removed
COMMENT ON FUNCTION public.create_game_results() IS 'Game results creation function - trigger disabled to prevent conflicts with application-level results creation';
