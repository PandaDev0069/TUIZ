-- Database cleanup functions for games and guest players
-- This file contains SQL functions for automatic cleanup operations

-- Function to cleanup old games and guest players
CREATE OR REPLACE FUNCTION cleanup_old_games_and_guests(
  finished_retention_minutes INTEGER DEFAULT 5,
  waiting_timeout_minutes INTEGER DEFAULT 2,
  cancelled_timeout_minutes INTEGER DEFAULT 1,
  inactive_guest_timeout_minutes INTEGER DEFAULT 3,
  batch_size INTEGER DEFAULT 100
)
RETURNS TABLE(
  action TEXT,
  count INTEGER,
  details TEXT
) AS $$
DECLARE
  finished_cutoff TIMESTAMP;
  waiting_cutoff TIMESTAMP;
  cancelled_cutoff TIMESTAMP;
  guest_cutoff TIMESTAMP;
  games_deleted INTEGER := 0;
  guests_deleted INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Calculate cutoff times
  finished_cutoff := NOW() - (finished_retention_minutes || ' minutes')::INTERVAL;
  waiting_cutoff := NOW() - (waiting_timeout_minutes || ' minutes')::INTERVAL;
  cancelled_cutoff := NOW() - (cancelled_timeout_minutes || ' minutes')::INTERVAL;
  guest_cutoff := NOW() - (inactive_guest_timeout_minutes || ' minutes')::INTERVAL;

  -- Log cleanup start
  RETURN QUERY SELECT 'INFO'::TEXT, 0, 'Starting cleanup operation at ' || NOW()::TEXT;

  -- Step 1: Clean up inactive guest players from old games first
  DELETE FROM game_players 
  WHERE id IN (
    SELECT id FROM game_players 
    WHERE is_guest = true 
      AND is_active = false 
      AND joined_at < guest_cutoff
    LIMIT batch_size
  );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  guests_deleted := guests_deleted + temp_count;
  
  IF temp_count > 0 THEN
    RETURN QUERY SELECT 'GUEST_CLEANUP'::TEXT, temp_count, 'Deleted inactive guest players';
  END IF;

  -- Step 2: Clean up guests from finished games (cascade cleanup)
  DELETE FROM game_players 
  WHERE id IN (
    SELECT gp.id FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.is_guest = true 
      AND g.status = 'finished' 
      AND g.ended_at < finished_cutoff
    LIMIT batch_size
  );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  guests_deleted := guests_deleted + temp_count;
  
  IF temp_count > 0 THEN
    RETURN QUERY SELECT 'GUEST_CASCADE'::TEXT, temp_count, 'Deleted guests from finished games';
  END IF;

  -- Step 3: Clean up finished games (after guest cleanup)
  DELETE FROM games 
  WHERE id IN (
    SELECT id FROM games 
    WHERE status = 'finished' 
      AND ended_at < finished_cutoff
      AND ended_at IS NOT NULL
    LIMIT batch_size
  );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  games_deleted := games_deleted + temp_count;
  
  IF temp_count > 0 THEN
    RETURN QUERY SELECT 'FINISHED_GAMES'::TEXT, temp_count, 'Deleted finished games older than ' || finished_retention_minutes || ' minutes';
  END IF;

  -- Step 4: Clean up waiting games (abandoned)
  DELETE FROM games 
  WHERE id IN (
    SELECT id FROM games 
    WHERE status = 'waiting' 
      AND created_at < waiting_cutoff
    LIMIT batch_size
  );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  games_deleted := games_deleted + temp_count;
  
  IF temp_count > 0 THEN
    RETURN QUERY SELECT 'WAITING_GAMES'::TEXT, temp_count, 'Deleted abandoned waiting games older than ' || waiting_timeout_minutes || ' minutes';
  END IF;

  -- Step 5: Clean up cancelled games
  DELETE FROM games 
  WHERE id IN (
    SELECT id FROM games 
    WHERE status = 'cancelled' 
      AND ended_at < cancelled_cutoff
      AND ended_at IS NOT NULL
    LIMIT batch_size
  );
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  games_deleted := games_deleted + temp_count;
  
  IF temp_count > 0 THEN
    RETURN QUERY SELECT 'CANCELLED_GAMES'::TEXT, temp_count, 'Deleted cancelled games older than ' || cancelled_timeout_minutes || ' minutes';
  END IF;

  -- Summary
  RETURN QUERY SELECT 'SUMMARY'::TEXT, games_deleted, 'Total games deleted: ' || games_deleted || ', guests deleted: ' || guests_deleted;
  
END;
$$ LANGUAGE plpgsql;

-- Function to get cleanup statistics (for monitoring)
CREATE OR REPLACE FUNCTION get_cleanup_stats()
RETURNS TABLE(
  category TEXT,
  count BIGINT,
  oldest_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Games by status
  RETURN QUERY 
  SELECT 'finished_games'::TEXT, COUNT(*)::BIGINT, MIN(ended_at)
  FROM games 
  WHERE status = 'finished' AND ended_at IS NOT NULL;
  
  RETURN QUERY 
  SELECT 'waiting_games'::TEXT, COUNT(*)::BIGINT, MIN(created_at)
  FROM games 
  WHERE status = 'waiting';
  
  RETURN QUERY 
  SELECT 'cancelled_games'::TEXT, COUNT(*)::BIGINT, MIN(ended_at)
  FROM games 
  WHERE status = 'cancelled' AND ended_at IS NOT NULL;
  
  RETURN QUERY 
  SELECT 'active_games'::TEXT, COUNT(*)::BIGINT, MIN(started_at)
  FROM games 
  WHERE status = 'active';
  
  -- Guest players
  RETURN QUERY 
  SELECT 'guest_players_active'::TEXT, COUNT(*)::BIGINT, MIN(joined_at)
  FROM game_players 
  WHERE is_guest = true AND is_active = true;
  
  RETURN QUERY 
  SELECT 'guest_players_inactive'::TEXT, COUNT(*)::BIGINT, MIN(joined_at)
  FROM game_players 
  WHERE is_guest = true AND is_active = false;
  
END;
$$ LANGUAGE plpgsql;

-- Function to preview what would be cleaned up (dry run)
CREATE OR REPLACE FUNCTION preview_cleanup(
  finished_retention_minutes INTEGER DEFAULT 5,
  waiting_timeout_minutes INTEGER DEFAULT 2,
  cancelled_timeout_minutes INTEGER DEFAULT 1,
  inactive_guest_timeout_minutes INTEGER DEFAULT 3
)
RETURNS TABLE(
  cleanup_type TEXT,
  count BIGINT,
  sample_ids TEXT[]
) AS $$
DECLARE
  finished_cutoff TIMESTAMP;
  waiting_cutoff TIMESTAMP;
  cancelled_cutoff TIMESTAMP;
  guest_cutoff TIMESTAMP;
BEGIN
  -- Calculate cutoff times
  finished_cutoff := NOW() - (finished_retention_minutes || ' minutes')::INTERVAL;
  waiting_cutoff := NOW() - (waiting_timeout_minutes || ' minutes')::INTERVAL;
  cancelled_cutoff := NOW() - (cancelled_timeout_minutes || ' minutes')::INTERVAL;
  guest_cutoff := NOW() - (inactive_guest_timeout_minutes || ' minutes')::INTERVAL;

  -- Preview finished games
  RETURN QUERY 
  SELECT 'finished_games'::TEXT, 
         COUNT(*)::BIGINT,
         ARRAY(SELECT id::TEXT FROM games WHERE status = 'finished' AND ended_at < finished_cutoff LIMIT 5)
  FROM games 
  WHERE status = 'finished' AND ended_at < finished_cutoff;

  -- Preview waiting games
  RETURN QUERY 
  SELECT 'waiting_games'::TEXT,
         COUNT(*)::BIGINT,
         ARRAY(SELECT id::TEXT FROM games WHERE status = 'waiting' AND created_at < waiting_cutoff LIMIT 5)
  FROM games 
  WHERE status = 'waiting' AND created_at < waiting_cutoff;

  -- Preview cancelled games
  RETURN QUERY 
  SELECT 'cancelled_games'::TEXT,
         COUNT(*)::BIGINT,
         ARRAY(SELECT id::TEXT FROM games WHERE status = 'cancelled' AND ended_at < cancelled_cutoff LIMIT 5)
  FROM games 
  WHERE status = 'cancelled' AND ended_at < cancelled_cutoff;

  -- Preview inactive guests
  RETURN QUERY 
  SELECT 'inactive_guests'::TEXT,
         COUNT(*)::BIGINT,
         ARRAY(SELECT id::TEXT FROM game_players WHERE is_guest = true AND is_active = false AND joined_at < guest_cutoff LIMIT 5)
  FROM game_players 
  WHERE is_guest = true AND is_active = false AND joined_at < guest_cutoff;

END;
$$ LANGUAGE plpgsql;
