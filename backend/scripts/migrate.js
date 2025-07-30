#!/usr/bin/env node

/**
 * Database Migration Script
 * Adds the game_player_uuid column to the users table
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  console.log('🔄 Starting database migration...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('📝 Step 1: Adding game_player_uuid column to users table...');
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add the game_player_uuid column
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS game_player_uuid UUID UNIQUE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_users_game_player_uuid 
        ON public.users(game_player_uuid);
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.users.game_player_uuid 
        IS 'Persistent UUID used for game participation tracking across multiple games';
        
        -- Return success message
        SELECT 'Migration completed successfully' as result;
      `
    });

    if (error) {
      // Try alternative approach using individual queries
      console.log('🔧 Trying alternative migration approach...');
      
      // Try to add column
      const { error: alterError } = await supabase
        .from('users')
        .select('game_player_uuid')
        .limit(1);
      
      if (alterError && alterError.code === '42703') {
        console.log('❌ Column does not exist and cannot be added via client');
        console.log('📋 Please run this SQL manually in your Supabase SQL Editor:');
        console.log(`
-- Migration SQL for adding game_player_uuid to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS game_player_uuid UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_game_player_uuid 
ON public.users(game_player_uuid);

COMMENT ON COLUMN public.users.game_player_uuid 
IS 'Persistent UUID used for game participation tracking across multiple games';
        `);
        return;
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('📊 Migration Result:', data);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('game_player_uuid')
      .limit(1);
    
    if (verifyError) {
      if (verifyError.code === '42703') {
        console.log('❌ Verification failed: Column still does not exist');
      } else {
        console.log('⚠️ Verification error:', verifyError);
      }
    } else {
      console.log('✅ Migration verified successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration().then(() => {
    console.log('\n🏁 Migration script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = runMigration;
