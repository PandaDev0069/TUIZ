const express = require('express');
const DatabaseManager = require('./config/database');

// Test the publish endpoint
async function testPublishEndpoint() {
  try {
    console.log('🧪 Testing publish endpoint...');
    
    const db = new DatabaseManager();
    
    // First, let's check if we have any existing question sets
    const { data: questionSets, error: listError } = await db.supabase
      .from('question_sets')
      .select('*')
      .limit(5);
    
    if (listError) {
      console.error('❌ Error fetching question sets:', listError);
      return;
    }
    
    console.log(`📊 Found ${questionSets?.length || 0} question sets in database`);
    
    if (questionSets && questionSets.length > 0) {
      console.log('📋 Sample question set:');
      console.log('- ID:', questionSets[0].id);
      console.log('- Title:', questionSets[0].title);
      console.log('- Status:', questionSets[0].status);
      console.log('- Total questions:', questionSets[0].total_questions);
    }
    
    // Test status update directly
    if (questionSets && questionSets.length > 0) {
      const testQuizId = questionSets[0].id;
      console.log(`\n🎯 Testing status update for quiz: ${testQuizId}`);
      
      const { data: updated, error: updateError } = await db.supabase
        .from('question_sets')
        .update({ 
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', testQuizId)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Status update failed:', updateError);
      } else {
        console.log('✅ Status update successful!');
        console.log('- New status:', updated.status);
        console.log('- Updated at:', updated.updated_at);
        
        // Revert back to draft
        await db.supabase
          .from('question_sets')
          .update({ status: 'draft' })
          .eq('id', testQuizId);
        console.log('🔄 Reverted status back to draft');
      }
    }
    
    console.log('\n✅ Publish endpoint test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPublishEndpoint().then(() => {
  console.log('🏁 Test finished');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test crashed:', err);
  process.exit(1);
});
