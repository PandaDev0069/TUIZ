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

async function applyHostControlMigration() {
  try {
    console.log('🔄 Applying host control migration (008_add_host_control_enabled.sql)...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/008_add_host_control_enabled.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.error('❌ Statement failed:', error);
          console.error('📄 Statement was:', statement);
          process.exit(1);
        }
        
        console.log('✅ Statement executed successfully');
      }
    }
    
    console.log('✅ Host control migration applied successfully!');
    
    // Test the new column exists
    console.log('🔍 Testing new host_control_enabled column...');
    const { data: testData, error: testError } = await supabase
      .from('games')
      .select('id, host_control_enabled')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing new column:', testError);
    } else {
      console.log('✅ New host_control_enabled column is accessible');
      console.log('📊 Sample data:', testData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

applyHostControlMigration();
