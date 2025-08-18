-- Migration 008: Add host_control_enabled column to games table
-- Host Control System Integration
-- Date: 2025-08-12

-- Add host_control_enabled column to games table
ALTER TABLE games 
ADD COLUMN host_control_enabled BOOLEAN DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN games.host_control_enabled IS 'Indicates if host control features are enabled for this game';

-- Create index for performance on host control queries
CREATE INDEX IF NOT EXISTS idx_games_host_control_enabled ON games(host_control_enabled);
