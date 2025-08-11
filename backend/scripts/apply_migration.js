const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for schema changes

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

// Create Supabase client with service role (needed for schema changes)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔄 Applying database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../docs/database/add_cloned_from_field.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL:', migrationSQL);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('📊 Result:', data);
    
    // Test the new column exists
    const { data: testData, error: testError } = await supabase
      .from('question_sets')
      .select('id, cloned_from')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing new column:', testError);
    } else {
      console.log('✅ New cloned_from column is accessible');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

applyMigration();
