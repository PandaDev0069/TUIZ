-- Migration 009: Add missing snapshot types to game_analytics_snapshots
-- Adds 'game_start' and 'game_end' to the allowed snapshot types

DO $$
BEGIN
    -- Update the constraint to include new snapshot types
    ALTER TABLE game_analytics_snapshots DROP CONSTRAINT IF EXISTS game_analytics_snapshots_snapshot_type_check;
    
    ALTER TABLE game_analytics_snapshots ADD CONSTRAINT game_analytics_snapshots_snapshot_type_check 
    CHECK (snapshot_type IN (
        'question_start', 
        'question_end', 
        'game_pause', 
        'game_resume', 
        'player_action', 
        'game_start', 
        'game_end'
    ));
    
    -- Log the migration
    RAISE NOTICE 'Migration 009: Added game_start and game_end snapshot types to game_analytics_snapshots';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration 009 failed: %', SQLERRM;
        RAISE;
END
$$;

-- Add helpful comment
COMMENT ON CONSTRAINT game_analytics_snapshots_snapshot_type_check ON game_analytics_snapshots IS 'Updated to include game_start and game_end snapshot types for comprehensive game tracking';
