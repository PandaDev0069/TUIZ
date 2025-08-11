const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking question_sets schema...');
    
    // Try to select a record with cloned_from field
    const { data, error } = await supabase
      .from('question_sets')
      .select('id, title, cloned_from')
      .limit(1);
    
    if (error) {
      if (error.message.includes('cloned_from')) {
        console.log('❌ cloned_from field does not exist in question_sets table');
        console.log('📋 You need to add the field manually in Supabase dashboard:');
        console.log('   1. Go to Supabase Dashboard > Table Editor > question_sets');
        console.log('   2. Add a new column:');
        console.log('      - Name: cloned_from');
        console.log('      - Type: uuid');
        console.log('      - Default: null');
        console.log('      - Allow null: true');
        console.log('   3. Optionally add foreign key reference to question_sets(id)');
      } else {
        console.error('❌ Error checking schema:', error);
      }
    } else {
      console.log('✅ cloned_from field exists in question_sets table');
      console.log('📊 Sample data:', data);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema();
