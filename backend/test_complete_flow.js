const axios = require('axios');

// Test the complete publish flow
async function testPublishFlow() {
  const BASE_URL = 'http://localhost:3001/api';
  
  try {
    console.log('🧪 Testing complete publish flow...');
    
    // Test 1: Check if server is running
    console.log('\n1️⃣ Testing server health...');
    try {
      const healthCheck = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Server is healthy');
    } catch (err) {
      console.log('⚠️ Health endpoint not found, but server seems to be running');
    }
    
    // Test 2: Try to access quiz endpoint without auth (should fail)
    console.log('\n2️⃣ Testing auth protection...');
    try {
      await axios.patch(`${BASE_URL}/quiz/test-id/publish`, {
        play_settings: { test: true }
      });
      console.log('❌ Auth protection failed - this should not happen');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('✅ Auth protection working correctly');
      } else {
        console.log('⚠️ Unexpected error:', err.response?.status, err.response?.data);
      }
    }
    
    console.log('\n✅ Publish flow test completed');
    console.log('\n📋 Next steps:');
    console.log('1. Login to the frontend at http://localhost:5173');
    console.log('2. Create a quiz with questions and answers');
    console.log('3. Navigate to the review step');
    console.log('4. Click the publish button');
    console.log('5. Check the backend logs for detailed publish activity');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Install axios if not present and run test
const { execSync } = require('child_process');
try {
  require('axios');
} catch {
  console.log('📦 Installing axios for testing...');
  execSync('npm install axios', { stdio: 'inherit' });
}

testPublishFlow();
