/**
 * Script to fix the database trigger foreign key issue
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTriggerForeignKey() {
  try {
    console.log('🔧 Fixing database trigger foreign key issue...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix_trigger_foreign_key.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error fixing trigger:', error);
      process.exit(1);
    }
    
    console.log('✅ Database trigger fixed successfully!');
    console.log('📋 The trigger now uses game_players.id instead of game_players.player_id');
    console.log('🎯 This should resolve the foreign key constraint violation');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
fixTriggerForeignKey();
