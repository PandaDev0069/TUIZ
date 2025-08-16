const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

async function updatePlayerActionTypes() {
  console.log('🔄 Updating player_actions constraint to include joined and left action types...');
  
  // For now, provide the SQL that should be run manually
  console.log('');
  console.log('📋 Please run the following SQL in your Supabase SQL editor:');
  console.log('');
  console.log('-- Migration 010: Add player join/leave action types');
  console.log('ALTER TABLE player_actions DROP CONSTRAINT IF EXISTS player_actions_action_type_check;');
  console.log('');
  console.log('ALTER TABLE player_actions ADD CONSTRAINT player_actions_action_type_check');
  console.log('CHECK (action_type IN (');
  console.log("  'kicked',");
  console.log("  'muted',");
  console.log("  'unmuted',");
  console.log("  'warned',");
  console.log("  'transferred_host',");
  console.log("  'joined',");
  console.log("  'left'");
  console.log('));');
  console.log('');
  console.log('✅ After running this SQL, player join and leave actions will be tracked automatically');
}

updatePlayerActionTypes();
