-- Add updated_at column to games table
-- This column is needed for tracking when game settings are updated

ALTER TABLE games 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add a comment to explain the purpose
COMMENT ON COLUMN games.updated_at IS 'Timestamp of when the game record was last updated';

-- Create an index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at);

-- Update existing records to have the same updated_at as created_at
UPDATE games 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add a trigger to automatically update the updated_at column on any update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
