const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugRLSIssue() {
  console.log('🔍 Debugging RLS Issue for Quiz Creation');
  
  try {
    // 1. Check current RLS policies
    console.log('\n📋 Checking current RLS policies...');
    const { data: policies, error: policyError } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname, roles, cmd, with_check')
      .eq('schemaname', 'public')
      .eq('tablename', 'question_sets');
    
    if (policyError) {
      console.error('❌ Error fetching policies:', policyError);
    } else {
      console.log('📄 Current policies:', policies);
    }

    // 2. Check if table has RLS enabled
    console.log('\n🔒 Checking if RLS is enabled...');
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin.rpc('check_rls_enabled', {
      table_name: 'question_sets'
    });
    
    if (rlsError) {
      console.log('⚠️ Could not check RLS status (this is okay)');
    } else {
      console.log('🔐 RLS status:', rlsStatus);
    }

    // 3. Drop and recreate the INSERT policy
    console.log('\n🔧 Fixing INSERT policy...');
    
    // Drop existing policy
    const dropResult = await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "allow_insert_own_question_sets" ON public.question_sets;'
    });
    
    console.log('🗑️ Dropped old policy:', dropResult);

    // Create new policy
    const createResult = await supabaseAdmin.rpc('exec_sql', {
      sql: `CREATE POLICY "allow_insert_own_question_sets" ON public.question_sets
            FOR INSERT 
            TO authenticated
            WITH CHECK (auth.uid() = user_id);`
    });
    
    console.log('✨ Created new policy:', createResult);

    // 4. Test user authentication
    console.log('\n👤 Testing user authentication...');
    const testUserId = '039861fb-ce99-4dad-a924-b022de125b87';
    
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(testUserId);
    if (userError) {
      console.error('❌ User fetch error:', userError);
    } else {
      console.log('✅ User found:', { id: user.user.id, email: user.user.email });
    }

    // 5. Test INSERT with service role (should work)
    console.log('\n🧪 Testing INSERT with service role...');
    const { data: testInsert, error: insertError } = await supabaseAdmin
      .from('question_sets')
      .insert({
        user_id: testUserId,
        title: 'RLS Debug Test Quiz',
        description: 'Testing RLS policy',
        category: 'general',
        difficulty_level: 'medium',
        is_public: false,
        estimated_duration: 5,
        total_questions: 0,
        status: 'draft'
      })
      .select();

    if (insertError) {
      console.error('❌ Service role INSERT failed:', insertError);
    } else {
      console.log('✅ Service role INSERT successful:', testInsert);
      
      // Clean up test data
      await supabaseAdmin
        .from('question_sets')
        .delete()
        .eq('id', testInsert[0].id);
      console.log('🧹 Cleaned up test data');
    }

    console.log('\n✅ RLS debugging complete!');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugRLSIssue();
