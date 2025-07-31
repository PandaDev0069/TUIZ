-- RLS Policies for game_results table
-- This file contains comprehensive RLS policies for the game_results table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Game results viewable by all" ON public.game_results;
DROP POLICY IF EXISTS "Service role can manage game results" ON public.game_results;
DROP POLICY IF EXISTS "Users can view game results" ON public.game_results;
DROP POLICY IF EXISTS "Users can insert their own game results" ON public.game_results;
DROP POLICY IF EXISTS "Service role full access to game results" ON public.game_results;
DROP POLICY IF EXISTS "Game hosts can view their game results" ON public.game_results;

-- Enable RLS on game_results table
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role has full access (for backend operations)
CREATE POLICY "Service role full access to game results"
  ON public.game_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Authenticated users can view game results where they participated
CREATE POLICY "Users can view game results they participated in"
  ON public.game_results
  FOR SELECT
  TO authenticated
  USING (
    player_id IN (
      SELECT game_player_uuid 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 3: Game hosts can view all results from their games
CREATE POLICY "Game hosts can view their game results"
  ON public.game_results
  FOR SELECT
  TO authenticated
  USING (
    game_id IN (
      SELECT id 
      FROM public.games 
      WHERE host_id = auth.uid()
    )
  );

-- Policy 4: Allow system to insert game results (via service role or triggers)
CREATE POLICY "System can insert game results"
  ON public.game_results
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 5: Allow authenticated users to view public game results (for leaderboards)
CREATE POLICY "Public game results viewable by authenticated users"
  ON public.game_results
  FOR SELECT
  TO authenticated
  USING (
    game_id IN (
      SELECT g.id 
      FROM public.games g
      JOIN public.question_sets qs ON g.question_set_id = qs.id
      WHERE qs.is_public = true
    )
  );

-- Policy 6: Anonymous users can view public game results (for public leaderboards)
CREATE POLICY "Public game results viewable by anonymous users"
  ON public.game_results
  FOR SELECT
  TO anon
  USING (
    game_id IN (
      SELECT g.id 
      FROM public.games g
      JOIN public.question_sets qs ON g.question_set_id = qs.id
      WHERE qs.is_public = true
      AND g.status = 'finished'
    )
  );

-- Grant necessary permissions
GRANT SELECT ON public.game_results TO anon;
GRANT SELECT ON public.game_results TO authenticated;
GRANT ALL ON public.game_results TO service_role;

-- Create indexes for better performance on policy queries
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON public.game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game_id ON public.game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_final_rank ON public.game_results(final_rank);
CREATE INDEX IF NOT EXISTS idx_game_results_final_score ON public.game_results(final_score);

-- Create a function to automatically create game results when a game finishes
CREATE OR REPLACE FUNCTION public.create_game_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create results when game status changes to 'finished'
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    
    -- Insert game results for all players who participated in this game
    INSERT INTO public.game_results (
      game_id,
      player_id,
      final_score,
      final_rank,
      total_correct,
      total_questions,
      average_response_time,
      longest_streak,
      completion_percentage
    )
    SELECT 
      gp.game_id,
      gp.player_id,
      COALESCE(gp.current_score, 0) as final_score,
      COALESCE(gp.current_rank, 0) as final_rank,
      COALESCE(
        (SELECT COUNT(*) 
         FROM public.player_answers pa 
         WHERE pa.game_id = gp.game_id 
         AND pa.player_id = gp.player_id 
         AND pa.is_correct = true), 0
      ) as total_correct,
      COALESCE(
        (SELECT COUNT(*) 
         FROM public.player_answers pa 
         WHERE pa.game_id = gp.game_id 
         AND pa.player_id = gp.player_id), 0
      ) as total_questions,
      COALESCE(
        (SELECT AVG(pa.response_time) 
         FROM public.player_answers pa 
         WHERE pa.game_id = gp.game_id 
         AND pa.player_id = gp.player_id 
         AND pa.response_time IS NOT NULL), 0
      )::integer as average_response_time,
      COALESCE(gp.current_streak, 0) as longest_streak,
      CASE 
        WHEN NEW.questions_answered > 0 THEN
          (COALESCE(
            (SELECT COUNT(*) 
             FROM public.player_answers pa 
             WHERE pa.game_id = gp.game_id 
             AND pa.player_id = gp.player_id), 0
          ) * 100.0 / NEW.questions_answered)
        ELSE 0
      END as completion_percentage
    FROM public.game_players gp
    WHERE gp.game_id = NEW.id
    AND gp.is_active = true
    -- Avoid duplicates if results already exist
    AND NOT EXISTS (
      SELECT 1 FROM public.game_results gr 
      WHERE gr.game_id = gp.game_id 
      AND gr.player_id = gp.player_id
    );
    
    RAISE NOTICE 'Created game results for game %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create game results when game finishes
DROP TRIGGER IF EXISTS trigger_create_game_results ON public.games;
CREATE TRIGGER trigger_create_game_results
  AFTER UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.create_game_results();

-- Create a function to manually create game results (for testing or manual operations)
CREATE OR REPLACE FUNCTION public.create_game_results_manual(game_id_param uuid)
RETURNS json AS $$
DECLARE
  result_count integer;
  game_record record;
BEGIN
  -- Check if game exists and is finished
  SELECT * INTO game_record 
  FROM public.games 
  WHERE id = game_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  IF game_record.status != 'finished' THEN
    RETURN json_build_object('success', false, 'error', 'Game is not finished yet');
  END IF;
  
  -- Create game results
  INSERT INTO public.game_results (
    game_id,
    player_id,
    final_score,
    final_rank,
    total_correct,
    total_questions,
    average_response_time,
    longest_streak,
    completion_percentage
  )
  SELECT 
    gp.game_id,
    gp.player_id,
    COALESCE(gp.current_score, 0) as final_score,
    COALESCE(gp.current_rank, 0) as final_rank,
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.player_answers pa 
       WHERE pa.game_id = gp.game_id 
       AND pa.player_id = gp.player_id 
       AND pa.is_correct = true), 0
    ) as total_correct,
    COALESCE(
      (SELECT COUNT(*) 
       FROM public.player_answers pa 
       WHERE pa.game_id = gp.game_id 
       AND pa.player_id = gp.player_id), 0
    ) as total_questions,
    COALESCE(
      (SELECT AVG(pa.response_time) 
       FROM public.player_answers pa 
       WHERE pa.game_id = gp.game_id 
       AND pa.player_id = gp.player_id 
       AND pa.response_time IS NOT NULL), 0
    )::integer as average_response_time,
    COALESCE(gp.current_streak, 0) as longest_streak,
    CASE 
      WHEN game_record.questions_answered > 0 THEN
        (COALESCE(
          (SELECT COUNT(*) 
           FROM public.player_answers pa 
           WHERE pa.game_id = gp.game_id 
           AND pa.player_id = gp.player_id), 0
        ) * 100.0 / game_record.questions_answered)
      ELSE 0
    END as completion_percentage
  FROM public.game_players gp
  WHERE gp.game_id = game_id_param
  AND gp.is_active = true
  -- Avoid duplicates
  AND NOT EXISTS (
    SELECT 1 FROM public.game_results gr 
    WHERE gr.game_id = gp.game_id 
    AND gr.player_id = gp.player_id
  );
  
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true, 
    'results_created', result_count,
    'game_id', game_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the manual function
GRANT EXECUTE ON FUNCTION public.create_game_results_manual(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_game_results_manual(uuid) TO authenticated;

-- Create function for global leaderboard
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  limit_param integer DEFAULT 20,
  timeframe_param text DEFAULT 'all'
)
RETURNS TABLE (
  player_id uuid,
  player_name text,
  total_games bigint,
  total_score bigint,
  average_score numeric,
  average_rank numeric,
  best_rank integer,
  total_correct bigint,
  accuracy_percentage numeric,
  is_guest boolean
) AS $$
DECLARE
  time_filter text := '';
BEGIN
  -- Set time filter based on timeframe
  IF timeframe_param = 'week' THEN
    time_filter := 'AND gr.created_at >= NOW() - INTERVAL ''7 days''';
  ELSIF timeframe_param = 'month' THEN
    time_filter := 'AND gr.created_at >= NOW() - INTERVAL ''30 days''';
  END IF;

  RETURN QUERY EXECUTE format('
    SELECT 
      gr.player_id,
      COALESCE(gp.player_name, ''Unknown Player'') as player_name,
      COUNT(gr.id) as total_games,
      SUM(gr.final_score) as total_score,
      ROUND(AVG(gr.final_score), 2) as average_score,
      ROUND(AVG(gr.final_rank), 2) as average_rank,
      MIN(gr.final_rank) as best_rank,
      SUM(gr.total_correct) as total_correct,
      CASE 
        WHEN SUM(gr.total_questions) > 0 THEN 
          ROUND((SUM(gr.total_correct) * 100.0 / SUM(gr.total_questions)), 2)
        ELSE 0 
      END as accuracy_percentage,
      COALESCE(gp.is_guest, true) as is_guest
    FROM public.game_results gr
    LEFT JOIN public.game_players gp ON gr.player_id = gp.player_id 
      AND gr.game_id = gp.game_id
    WHERE 1=1 %s
    GROUP BY gr.player_id, gp.player_name, gp.is_guest
    HAVING COUNT(gr.id) > 0
    ORDER BY total_score DESC, average_score DESC
    LIMIT %s
  ', time_filter, limit_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on global leaderboard function
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(integer, text) TO service_role;
