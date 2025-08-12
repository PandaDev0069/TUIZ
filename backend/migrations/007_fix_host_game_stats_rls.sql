-- Fix host_game_stats view RLS security issue
-- Migration 007: Remove SECURITY DEFINER and fix RLS policy

-- 1. Drop the existing view with RLS policy
DROP POLICY IF EXISTS "host_game_stats_select_policy" ON host_game_stats;
DROP VIEW IF EXISTS host_game_stats;

-- 2. Recreate the view without RLS (since views don't need RLS, the underlying tables handle it)
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

-- 3. Grant proper permissions on the view
GRANT SELECT ON host_game_stats TO authenticated;
GRANT SELECT ON host_game_stats TO anon;

-- 4. Add comment explaining security model
COMMENT ON VIEW host_game_stats IS 'Host game statistics view. Security is enforced by underlying table RLS policies on games, host_sessions, player_actions, and game_analytics_snapshots tables.';

-- 5. Verify the underlying tables have proper RLS policies
-- (These should already exist from migration 006, but let's ensure they're correct)

-- Ensure games table RLS is enabled and has proper policies
DO $$
BEGIN
    -- Check if games table has RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE c.relname = 'games' 
        AND n.nspname = 'public' 
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE games ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Ensure there's a proper games select policy for hosts
DROP POLICY IF EXISTS "games_host_select_policy" ON games;
CREATE POLICY "games_host_select_policy" ON games
    FOR SELECT USING (
        -- Users can see games they host
        host_id = auth.uid()
        OR
        -- Or games they participate in (for players)
        id IN (
            SELECT DISTINCT game_id 
            FROM game_players 
            WHERE player_id = auth.uid()
        )
    );

-- Verify host_sessions policies exist and are correct
DROP POLICY IF EXISTS "host_sessions_view_policy" ON host_sessions;
CREATE POLICY "host_sessions_view_policy" ON host_sessions
    FOR SELECT USING (
        -- Users can only see their own host sessions
        host_user_id = auth.uid()
    );

-- Verify player_actions policies for view access
DROP POLICY IF EXISTS "player_actions_view_policy" ON player_actions;
CREATE POLICY "player_actions_view_policy" ON player_actions
    FOR SELECT USING (
        -- Host can see actions for their games, players can see actions affecting them
        game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
        OR
        player_id = auth.uid()
    );

-- Verify game_analytics_snapshots policies
DROP POLICY IF EXISTS "analytics_snapshots_view_policy" ON game_analytics_snapshots;
CREATE POLICY "analytics_snapshots_view_policy" ON game_analytics_snapshots
    FOR SELECT USING (
        -- Only hosts can see analytics for their games
        game_id IN (
            SELECT id FROM games WHERE host_id = auth.uid()
        )
    );

-- 6. Test query to ensure the view works correctly with RLS
-- (This is a comment for manual testing - uncomment to test)
-- SELECT game_id, game_code, status, host_actions_total 
-- FROM host_game_stats 
-- WHERE game_id = 'test-game-id';
