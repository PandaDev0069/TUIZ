-- Database Schema Extensions for Phase 6 Host Control
-- Backend Infrastructure Missing Components

-- 1. Add host control fields to games table
DO $$
BEGIN
    -- Add game state tracking columns (only new ones needed for host control)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'host_control_enabled') THEN
        ALTER TABLE games ADD COLUMN host_control_enabled BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'paused_at') THEN
        ALTER TABLE games ADD COLUMN paused_at TIMESTAMPTZ NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'pause_reason') THEN
        ALTER TABLE games ADD COLUMN pause_reason TEXT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'paused_duration') THEN
        ALTER TABLE games ADD COLUMN paused_duration INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'emergency_stop') THEN
        ALTER TABLE games ADD COLUMN emergency_stop BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'skipped_questions') THEN
        ALTER TABLE games ADD COLUMN skipped_questions INTEGER[] DEFAULT ARRAY[]::INTEGER[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'host_actions') THEN
        ALTER TABLE games ADD COLUMN host_actions JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'host_transfer_history') THEN
        ALTER TABLE games ADD COLUMN host_transfer_history JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Update the status constraint to include 'stopped' for emergency stops
    ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
    ALTER TABLE games ADD CONSTRAINT games_status_check CHECK (
        status::text = ANY (ARRAY[
            'waiting'::character varying,
            'active'::character varying,
            'paused'::character varying,
            'finished'::character varying,
            'cancelled'::character varying,
            'stopped'::character varying
        ]::text[])
    );
END
$$;

-- 2. Create player actions tracking table
CREATE TABLE IF NOT EXISTS player_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('kicked', 'muted', 'unmuted', 'warned', 'transferred_host')),
    action_data JSONB DEFAULT '{}'::jsonb,
    reason TEXT,
    duration_ms INTEGER NULL, -- For mutes and temporary bans
    performed_by UUID NULL, -- Host who performed the action
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL, -- For temporary actions
    is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes for player_actions
CREATE INDEX IF NOT EXISTS idx_player_actions_game_id ON player_actions (game_id);
CREATE INDEX IF NOT EXISTS idx_player_actions_player_id ON player_actions (player_id);
CREATE INDEX IF NOT EXISTS idx_player_actions_type ON player_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_player_actions_active ON player_actions (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_player_actions_expires ON player_actions (expires_at) WHERE expires_at IS NOT NULL;

-- 3. Create game analytics snapshots table
CREATE TABLE IF NOT EXISTS game_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('question_start', 'question_end', 'game_pause', 'game_resume', 'player_action')),
    question_number INTEGER NULL,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
    
    -- Snapshot data includes:
    -- - player_count: INTEGER
    -- - active_players: TEXT[]
    -- - average_score: NUMERIC
    -- - leaderboard: JSONB
    -- - answer_distribution: JSONB (for question_end)
    -- - response_times: NUMERIC[] (for question_end)
);

-- Add indexes for game_analytics_snapshots
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_game_id ON game_analytics_snapshots (game_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type ON game_analytics_snapshots (snapshot_type);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_question ON game_analytics_snapshots (question_number);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_created ON game_analytics_snapshots (created_at);

-- 4. Create host session tracking table
CREATE TABLE IF NOT EXISTS host_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    actions_count INTEGER DEFAULT 0,
    last_action_at TIMESTAMPTZ DEFAULT NOW(),
    session_data JSONB DEFAULT '{}'::jsonb
    
    -- Session data includes:
    -- - total_questions_managed: INTEGER
    -- - total_players_managed: INTEGER
    -- - game_pauses: INTEGER
    -- - player_kicks: INTEGER
    -- - emergency_stops: INTEGER
);

-- Add indexes for host_sessions
CREATE INDEX IF NOT EXISTS idx_host_sessions_game_id ON host_sessions (game_id);
CREATE INDEX IF NOT EXISTS idx_host_sessions_host_id ON host_sessions (host_user_id);
CREATE INDEX IF NOT EXISTS idx_host_sessions_active ON host_sessions (session_end) WHERE session_end IS NULL;

-- 5. Add host control permissions to game_settings
DO $$
BEGIN
    -- Add host permissions structure to game_settings if not exists
    UPDATE games 
    SET game_settings = game_settings || jsonb_build_object(
        'hostPermissions', jsonb_build_object(
            'canPauseGame', true,
            'canSkipQuestions', true,
            'canKickPlayers', true,
            'canMutePlayers', true,
            'canAdjustTimer', true,
            'canTransferHost', true,
            'canViewAnalytics', true,
            'canEmergencyStop', true
        )
    )
    WHERE game_settings IS NOT NULL 
    AND NOT game_settings ? 'hostPermissions';
END
$$;

-- 6. Create function to log host actions
CREATE OR REPLACE FUNCTION log_host_action(
    p_game_id UUID,
    p_host_id UUID,
    p_action_type TEXT,
    p_action_data JSONB DEFAULT '{}'::jsonb,
    p_target_player_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    action_id UUID;
BEGIN
    -- Insert the action log
    INSERT INTO player_actions (
        game_id,
        player_id,
        action_type,
        action_data,
        performed_by,
        performed_at
    ) VALUES (
        p_game_id,
        COALESCE(p_target_player_id, p_host_id),
        p_action_type,
        p_action_data,
        p_host_id,
        NOW()
    ) RETURNING id INTO action_id;
    
    -- Update host session action count
    UPDATE host_sessions 
    SET 
        actions_count = actions_count + 1,
        last_action_at = NOW()
    WHERE game_id = p_game_id 
    AND host_user_id = p_host_id 
    AND session_end IS NULL;
    
    RETURN action_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to create analytics snapshot
CREATE OR REPLACE FUNCTION create_analytics_snapshot(
    p_game_id UUID,
    p_snapshot_type TEXT,
    p_question_number INTEGER DEFAULT NULL,
    p_snapshot_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    snapshot_id UUID;
BEGIN
    INSERT INTO game_analytics_snapshots (
        game_id,
        snapshot_type,
        question_number,
        snapshot_data,
        created_at
    ) VALUES (
        p_game_id,
        p_snapshot_type,
        p_question_number,
        p_snapshot_data,
        NOW()
    ) RETURNING id INTO snapshot_id;
    
    RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to clean up expired player actions
CREATE OR REPLACE FUNCTION cleanup_expired_player_actions() RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Deactivate expired temporary actions (like mutes)
    UPDATE player_actions 
    SET is_active = FALSE
    WHERE is_active = TRUE 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Create RLS policies for new tables
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_sessions ENABLE ROW LEVEL SECURITY;

-- Player actions policies
DROP POLICY IF EXISTS "player_actions_select_policy" ON player_actions;
CREATE POLICY "player_actions_select_policy" ON player_actions
    FOR SELECT USING (
        -- Host can see all actions for their games
        game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
        OR
        -- Players can see actions that affected them
        player_id = auth.uid()
    );

DROP POLICY IF EXISTS "player_actions_insert_policy" ON player_actions;
CREATE POLICY "player_actions_insert_policy" ON player_actions
    FOR INSERT WITH CHECK (
        -- Only hosts can create player actions for their games
        game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
    );

-- Analytics snapshots policies
DROP POLICY IF EXISTS "analytics_snapshots_select_policy" ON game_analytics_snapshots;
CREATE POLICY "analytics_snapshots_select_policy" ON game_analytics_snapshots
    FOR SELECT USING (
        -- Host can see analytics for their games
        game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "analytics_snapshots_insert_policy" ON game_analytics_snapshots;
CREATE POLICY "analytics_snapshots_insert_policy" ON game_analytics_snapshots
    FOR INSERT WITH CHECK (
        -- Only hosts can create analytics snapshots for their games
        game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
    );

-- Host sessions policies
DROP POLICY IF EXISTS "host_sessions_select_policy" ON host_sessions;
CREATE POLICY "host_sessions_select_policy" ON host_sessions
    FOR SELECT USING (
        -- Hosts can see their own sessions
        host_user_id = auth.uid()
    );

DROP POLICY IF EXISTS "host_sessions_insert_policy" ON host_sessions;
CREATE POLICY "host_sessions_insert_policy" ON host_sessions
    FOR INSERT WITH CHECK (
        -- Users can create sessions for games they host
        host_user_id = auth.uid()
        AND game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "host_sessions_update_policy" ON host_sessions;
CREATE POLICY "host_sessions_update_policy" ON host_sessions
    FOR UPDATE USING (
        -- Hosts can update their own sessions
        host_user_id = auth.uid()
    );

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_host_control_status ON games(status, host_id) WHERE status IN ('active', 'paused');
CREATE INDEX IF NOT EXISTS idx_games_emergency_stop ON games(emergency_stop) WHERE emergency_stop = TRUE;
CREATE INDEX IF NOT EXISTS idx_games_paused_at ON games(paused_at) WHERE paused_at IS NOT NULL;

-- 11. Add useful views for host control analytics
CREATE OR REPLACE VIEW host_game_stats AS
SELECT 
    g.id as game_id,
    g.game_code,
    g.host_id,
    g.status,
    g.created_at,
    g.started_at,
    g.ended_at,
    g.current_players,
    COALESCE(array_length(g.skipped_questions, 1), 0) as questions_skipped,
    (g.host_actions::jsonb)::text::jsonb as host_actions_summary,
    CASE 
        WHEN g.emergency_stop THEN 'emergency_stop'
        WHEN g.status = 'stopped' THEN 'manual_stop'
        ELSE 'normal'
    END as end_type,
    
    -- Host session stats
    hs.actions_count as host_actions_total,
    hs.session_start as host_session_start,
    hs.last_action_at as host_last_action,
    
    -- Player action stats
    (SELECT COUNT(*) FROM player_actions pa WHERE pa.game_id = g.id AND pa.action_type = 'kicked') as players_kicked,
    (SELECT COUNT(*) FROM player_actions pa WHERE pa.game_id = g.id AND pa.action_type = 'muted') as players_muted,
    
    -- Analytics snapshots count
    (SELECT COUNT(*) FROM game_analytics_snapshots gas WHERE gas.game_id = g.id) as analytics_snapshots
    
FROM games g
LEFT JOIN host_sessions hs ON g.id = hs.game_id AND hs.session_end IS NULL;

-- Enable RLS on the view and create policy to restrict access
ALTER VIEW host_game_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the view to ensure users only see their own game stats
DROP POLICY IF EXISTS "host_game_stats_select_policy" ON host_game_stats;
CREATE POLICY "host_game_stats_select_policy" ON host_game_stats
    FOR SELECT USING (
        -- Users can only see stats for games they host
        host_id = auth.uid()
    );

-- Grant permissions on the view
GRANT SELECT ON host_game_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE player_actions IS 'Tracks all host actions performed on players (kicks, mutes, warnings, etc.)';
COMMENT ON TABLE game_analytics_snapshots IS 'Stores analytics snapshots at key game moments for detailed analysis';
COMMENT ON TABLE host_sessions IS 'Tracks host session data and activity metrics';
COMMENT ON FUNCTION log_host_action IS 'Logs a host action and updates session statistics';
COMMENT ON FUNCTION create_analytics_snapshot IS 'Creates an analytics snapshot at a specific game moment';
COMMENT ON VIEW host_game_stats IS 'Comprehensive view of host game statistics and control actions';
