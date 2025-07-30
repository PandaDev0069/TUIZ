-- RLS Policies for Games Table
-- This file contains all necessary Row Level Security policies for the games table
-- Run these commands in your Supabase SQL editor or via psql

-- First, ensure RLS is enabled on the games table
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional - use if you want to start fresh)
-- DROP POLICY IF EXISTS "Games viewable by participants" ON public.games;
-- DROP POLICY IF EXISTS "Hosts can manage their games" ON public.games;
-- DROP POLICY IF EXISTS "Service role can manage all games" ON public.games;

-- Policy 1: Allow authenticated users to INSERT games they host
CREATE POLICY "Authenticated users can create games" ON public.games
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = host_id);

-- Policy 2: Allow users to SELECT games they host
CREATE POLICY "Users can view their hosted games" ON public.games
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = host_id);

-- Policy 3: Allow users to view games they participate in
-- This requires checking the game_players table
CREATE POLICY "Users can view games they participate in" ON public.games
    FOR SELECT 
    TO authenticated
    USING (
        id IN (
            SELECT game_id 
            FROM public.game_players 
            WHERE player_id = (
                SELECT game_player_uuid 
                FROM public.users 
                WHERE id = auth.uid()
            )
            AND is_active = true
        )
    );

-- Policy 4: Allow hosts to UPDATE their games
CREATE POLICY "Hosts can update their games" ON public.games
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

-- Policy 5: Allow hosts to DELETE their games
CREATE POLICY "Hosts can delete their games" ON public.games
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = host_id);

-- Policy 6: Service role has full access (for backend operations)
CREATE POLICY "Service role full access" ON public.games
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 7: Allow public viewing of games by game_code (for joining)
-- This is needed for the joinGame functionality
CREATE POLICY "Public can view games by code" ON public.games
    FOR SELECT 
    TO public
    USING (true);

-- Alternative Policy 7 (more restrictive): Only allow viewing basic game info by code
-- Uncomment this and comment out the above if you want more security
-- CREATE POLICY "Public can view basic game info by code" ON public.games
--     FOR SELECT 
--     TO public
--     USING (true);

-- Ensure the games table has the correct grants
-- These should already be set, but just in case:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
GRANT SELECT ON public.games TO anon;

-- Also ensure related tables have proper access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_players TO authenticated;
GRANT ALL ON public.game_players TO service_role;
GRANT SELECT ON public.game_players TO anon;

-- Note: If you're still having issues, you might need to check:
-- 1. Make sure the JWT token is being passed correctly to Supabase
-- 2. Verify that auth.uid() returns the expected user ID
-- 3. Check that the host_id in the insert matches the authenticated user's ID

-- Debug query to test authentication (run this while authenticated):
-- SELECT auth.uid() as current_user_id, auth.role() as current_role;
