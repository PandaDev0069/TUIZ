-- Migration 010: Add player join/leave action types to player_actions
-- Adds 'joined' and 'left' to the allowed action types for comprehensive player tracking

DO $$
BEGIN
    -- Update the constraint to include new action types
    ALTER TABLE player_actions DROP CONSTRAINT IF EXISTS player_actions_action_type_check;
    
    ALTER TABLE player_actions ADD CONSTRAINT player_actions_action_type_check 
    CHECK (action_type IN (
        'kicked', 
        'muted', 
        'unmuted', 
        'warned', 
        'transferred_host',
        'joined',
        'left'
    ));
    
    -- Log the migration
    RAISE NOTICE 'Migration 010: Added joined and left action types to player_actions';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration 010 failed: %', SQLERRM;
        RAISE;
END
$$;

-- Add helpful comment
COMMENT ON CONSTRAINT player_actions_action_type_check ON player_actions IS 'Updated to include joined and left action types for comprehensive player tracking';
