const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUserScopedClient() {
  console.log('🧪 Testing User-Scoped Client Issue');
  
  try {
    const testUserId = '039861fb-ce99-4dad-a924-b022de125b87';
    
    // Get the actual token from a login attempt
    console.log('\n🔑 Testing login to get valid token...');
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email: 'test@gmail.com',
      password: 'test123'  // Replace with actual password
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError);
      console.log('⚠️ Trying with service role token instead...');
      
      // Alternative: use the existing token that's working in the frontend
      const existingToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Im'; // From logs, but this is truncated
      
      console.log('🎭 Testing with user-scoped client using existing pattern...');
      
      // Create client exactly like the backend does
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${existingToken}` // This won't work, but let's see the error
          }
        }
      });

      console.log('❌ Cannot test with partial token');
      
    } else {
      console.log('✅ Login successful, testing with real token...');
      
      const userToken = loginData.session.access_token;
      console.log('🔑 Got user token:', userToken.substring(0, 30) + '...');
      
      // Create user-scoped client exactly like backend middleware does
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        }
      });

      // Test the same INSERT that's failing in the backend
      console.log('\n🎯 Testing quiz creation with user-scoped client...');
      const { data: quizResult, error: quizError } = await userClient
        .from('question_sets')
        .insert({
          title: 'Test Quiz from User Client',
          description: '',
          category: 'general',
          difficulty_level: 'medium',
          is_public: false,
          estimated_duration: 5,
          total_questions: 0,
          times_played: 0,
          average_score: 0.0,
          completion_rate: 0.0,
          status: 'draft',
          tags: [],
          thumbnail_url: null
          // Note: user_id should be automatically set by RLS policy to auth.uid()
        })
        .select();

      if (quizError) {
        console.error('❌ User client quiz creation failed:', quizError);
        
        // Try with explicit user_id
        console.log('\n🔄 Trying with explicit user_id...');
        const { data: quizResult2, error: quizError2 } = await userClient
          .from('question_sets')
          .insert({
            user_id: testUserId,  // Explicitly set user_id
            title: 'Test Quiz with Explicit User ID',
            description: '',
            category: 'general',
            difficulty_level: 'medium',
            is_public: false,
            estimated_duration: 5,
            total_questions: 0,
            times_played: 0,
            average_score: 0.0,
            completion_rate: 0.0,
            status: 'draft',
            tags: [],
            thumbnail_url: null
          })
          .select();

        if (quizError2) {
          console.error('❌ User client with explicit user_id failed:', quizError2);
        } else {
          console.log('✅ User client with explicit user_id successful:', quizResult2);
          // Clean up
          await supabaseAdmin.from('question_sets').delete().eq('id', quizResult2[0].id);
        }
        
      } else {
        console.log('✅ User client quiz creation successful:', quizResult);
        // Clean up
        await supabaseAdmin.from('question_sets').delete().eq('id', quizResult[0].id);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testUserScopedClient();
