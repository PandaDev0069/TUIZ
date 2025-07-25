const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugRLSIssue() {
  console.log('🔍 Debugging RLS Issue for Quiz Creation');
  
  try {
    // 1. Check current RLS policies
    console.log('\n📋 Checking current RLS policies...');
    const { data: policies, error: policyError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `SELECT policyname, roles, cmd, with_check 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename = 'question_sets'
              AND cmd = 'INSERT';`
      });
    
    if (policyError) {
      console.error('❌ Error fetching policies:', policyError);
    } else {
      console.log('📄 Current INSERT policies:', policies);
    }

    // 2. Drop and recreate the INSERT policy
    console.log('\n🔧 Fixing INSERT policy...');
    
    // Drop existing policy
    const { data: dropResult, error: dropError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: 'DROP POLICY IF EXISTS "allow_insert_own_question_sets" ON public.question_sets;'
      });
    
    if (dropError) {
      console.error('❌ Drop policy error:', dropError);
    } else {
      console.log('🗑️ Dropped old policy');
    }

    // Create new policy
    const { data: createResult, error: createError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `CREATE POLICY "allow_insert_own_question_sets" ON public.question_sets
              FOR INSERT 
              TO authenticated
              WITH CHECK (auth.uid() = user_id);`
      });
    
    if (createError) {
      console.error('❌ Create policy error:', createError);
    } else {
      console.log('✨ Created new policy');
    }

    // 3. Test user authentication
    console.log('\n👤 Testing user authentication...');
    const testUserId = '039861fb-ce99-4dad-a924-b022de125b87';
    
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(testUserId);
    if (userError) {
      console.error('❌ User fetch error:', userError);
    } else {
      console.log('✅ User found:', { id: user.user.id, email: user.user.email });
    }

    // 4. Test INSERT with service role (should work)
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

    // 5. Test with user token (simulating what the frontend does)
    console.log('\n🎭 Testing with user-scoped client...');
    
    // Get a fresh token for the user
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateAccessToken(testUserId);
    
    if (tokenError) {
      console.error('❌ Token generation failed:', tokenError);
    } else {
      console.log('🔑 Generated user token');
      
      // Create user-scoped client
      const userClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        }
      });

      // Test INSERT with user client
      const { data: userInsert, error: userInsertError } = await userClient
        .from('question_sets')
        .insert({
          user_id: testUserId,  // This should match auth.uid()
          title: 'User Client Test Quiz',
          description: 'Testing user-scoped client',
          category: 'general',
          difficulty_level: 'medium',
          is_public: false,
          estimated_duration: 5,
          total_questions: 0,
          status: 'draft'
        })
        .select();

      if (userInsertError) {
        console.error('❌ User client INSERT failed:', userInsertError);
      } else {
        console.log('✅ User client INSERT successful:', userInsert);
        
        // Clean up test data
        await supabaseAdmin
          .from('question_sets')
          .delete()
          .eq('id', userInsert[0].id);
        console.log('🧹 Cleaned up user test data');
      }
    }

    console.log('\n✅ RLS debugging complete!');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugRLSIssue();
