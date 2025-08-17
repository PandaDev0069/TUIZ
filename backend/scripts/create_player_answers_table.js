/**
 * Script to create the player_answers table
 * This fixes the "relation player_answers does not exist" error
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Required environment variables:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPlayerAnswersTable() {
  try {
    console.log('🚀 Creating player_answers table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_player_answers_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      process.exit(1);
    }
    
    console.log('✅ player_answers table created successfully!');
    console.log('📋 Table includes:');
    console.log('   - Basic answer tracking structure');
    console.log('   - Foreign key relationships');
    console.log('   - Performance indexes');
    console.log('   - Row Level Security policies');
    
    // Test the table
    console.log('🧪 Testing table access...');
    const { data: testData, error: testError } = await supabase
      .from('player_answers')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Table test failed:', testError);
    } else {
      console.log('✅ Table is accessible and ready for use');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
createPlayerAnswersTable();
