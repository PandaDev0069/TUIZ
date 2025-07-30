-- Migration: Add game_player_uuid to users table
-- Purpose: Enable persistent player identification across games for authenticated users

-- Add the game_player_uuid column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS game_player_uuid UUID UNIQUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_game_player_uuid 
ON public.users(game_player_uuid);

-- Add comment for documentation
COMMENT ON COLUMN public.users.game_player_uuid 
IS 'Persistent UUID used for game participation tracking across multiple games';

-- Create a function to automatically generate game_player_uuid for new users (optional)
CREATE OR REPLACE FUNCTION generate_game_player_uuid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.game_player_uuid IS NULL THEN
        NEW.game_player_uuid = gen_random_uuid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create trigger to auto-generate game_player_uuid for new users
-- Uncomment the following lines if you want automatic UUID generation
-- CREATE TRIGGER trigger_generate_game_player_uuid
--     BEFORE INSERT ON public.users
--     FOR EACH ROW
--     EXECUTE FUNCTION generate_game_player_uuid();

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'game_player_uuid';
