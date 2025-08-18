-- Fix the database trigger that's causing the foreign key constraint violation
-- The trigger was using game_players.player_id (user ID) instead of game_players.id (participation record ID)

CREATE OR REPLACE FUNCTION public.create_game_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create results when game status changes to 'finished'
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    
    -- Insert game results for all players who participated in this game
    -- FIXED: Use gp.id instead of gp.player_id to match the foreign key constraint
    INSERT INTO public.game_results (
      game_id,
      player_id,  -- This should reference game_players.id, not game_players.player_id
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
      gp.id as player_id,  -- FIXED: Use gp.id (participation record) instead of gp.player_id (user ID)
      COALESCE(gp.current_score, 0) as final_score,
      COALESCE(gp.current_rank, 0) as final_rank,
      COALESCE(
        (SELECT COUNT(*) 
         FROM public.player_answers pa 
         WHERE pa.game_id = gp.game_id 
         AND pa.player_id = gp.player_id  -- This is correct - player_answers.player_id should be the user ID
         AND pa.is_correct = true), 0
      ) as total_correct,
      COALESCE(
        (SELECT COUNT(*) 
         FROM public.player_answers pa 
         WHERE pa.game_id = gp.game_id 
         AND pa.player_id = gp.player_id  -- This is correct - player_answers.player_id should be the user ID
         ), 0
      ) as total_questions,
      COALESCE(
        (SELECT AVG(pa.response_time) 
         FROM public.player_answers pa 
         WHERE pa.game_id = gp.game_id 
         AND pa.player_id = gp.player_id  -- This is correct - player_answers.player_id should be the user ID
         AND pa.response_time IS NOT NULL), 0
      )::integer as average_response_time,
      COALESCE(gp.current_streak, 0) as longest_streak,
      CASE 
        WHEN NEW.questions_answered > 0 THEN
          (COALESCE(
            (SELECT COUNT(*) 
             FROM public.player_answers pa 
             WHERE pa.game_id = gp.game_id 
             AND pa.player_id = gp.player_id), 0  -- This is correct - player_answers.player_id should be the user ID
          ) * 100.0 / NEW.questions_answered)
        ELSE 0
      END as completion_percentage
    FROM public.game_players gp
    WHERE gp.game_id = NEW.id
    AND gp.is_active = true;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
