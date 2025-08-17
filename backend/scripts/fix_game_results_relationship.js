#!/usr/bin/env node

/**
 * Database Migration Script
 * Fixes the relationship between game_results and game_players tables
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  console.log('🔄 Starting database relationship fix migration...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('📝 Step 1: Checking for orphaned records...');
    
    // Check for orphaned game_results records
    const { data: orphanedRecords, error: orphanError } = await supabase
      .from('game_results')
      .select(`
        id, 
        player_id,
        game_players!left(id)
      `)
      .is('game_players.id', null);

    if (orphanError) {
      console.log('ℹ️  Could not check for orphaned records (expected if relationship doesn\'t exist yet)');
    } else if (orphanedRecords && orphanedRecords.length > 0) {
      console.log(`⚠️  Found ${orphanedRecords.length} orphaned game_results records`);
      console.log('🧹 Consider cleaning these up before adding the constraint');
    } else {
      console.log('✅ No orphaned records found');
    }

    console.log('📝 Step 2: Adding foreign key constraint...');
    
    // Add the foreign key constraint
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.game_results 
        ADD CONSTRAINT game_results_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES public.game_players(id) 
        ON DELETE CASCADE;
      `
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Foreign key constraint already exists, skipping...');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Foreign key constraint added successfully');
    }

    console.log('📝 Step 3: Adding performance index...');
    
    // Add index for better performance
    const { data: indexData, error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_game_results_player_id 
        ON public.game_results(player_id);
      `
    });

    if (indexError) {
      console.log('⚠️  Could not create index:', indexError.message);
    } else {
      console.log('✅ Performance index created successfully');
    }

    console.log('📝 Step 4: Verifying the relationship...');
    
    // Test the relationship
    const { data: testData, error: testError } = await supabase
      .from('game_results')
      .select(`
        id,
        final_score,
        game_players(player_name, is_guest)
      `)
      .limit(1);

    if (testError) {
      console.log('❌ Relationship test failed:', testError.message);
    } else {
      console.log('✅ Relationship test successful');
    }

    console.log('\n🎉 Database relationship fix migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
