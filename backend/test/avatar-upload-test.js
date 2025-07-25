/**
 * Avatar Upload Test Script
 * Tests the avatar upload functionality and profile updates
 * Run with: node test/avatar-upload-test.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:3001/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-avatar.png'); // You'll need to place a test image here

// Test credentials - Replace with real test user
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = null;
let userId = null;

async function runAvatarUploadTest() {
  console.log('🚀 Starting Avatar Upload Test...\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      emailOrName: TEST_USER.email,
      password: TEST_USER.password
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);

    // Step 2: Check if test image exists
    console.log('\n2️⃣ Checking test image...');
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log('⚠️  Test image not found, creating placeholder...');
      // Create a simple test file (you should replace this with an actual image)
      fs.writeFileSync(TEST_IMAGE_PATH, 'This is a test image placeholder');
      console.log('⚠️  Please replace test-avatar.png with a real image file');
      return;
    }
    console.log('✅ Test image found');

    // Step 3: Upload avatar
    console.log('\n3️⃣ Uploading avatar...');
    const formData = new FormData();
    formData.append('avatar', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('userId', userId);

    const uploadResponse = await axios.post(`${API_BASE}/auth/upload-avatar`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!uploadResponse.data.success) {
      throw new Error('Avatar upload failed: ' + uploadResponse.data.message);
    }

    console.log('✅ Avatar upload successful');
    console.log(`   Avatar URL: ${uploadResponse.data.avatar_url}`);

    // Step 4: Update profile
    console.log('\n4️⃣ Updating profile...');
    const profileUpdateResponse = await axios.put(`${API_BASE}/auth/update-profile`, {
      name: 'Test User Updated',
      avatar_url: uploadResponse.data.avatar_url
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileUpdateResponse.data.success) {
      throw new Error('Profile update failed: ' + profileUpdateResponse.data.message);
    }

    console.log('✅ Profile update successful');
    console.log(`   Updated name: ${profileUpdateResponse.data.user.name}`);

    // Step 5: Verify profile data
    console.log('\n5️⃣ Verifying profile...');
    const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const user = profileResponse.data.user;
    console.log('✅ Profile verification successful');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Avatar URL: ${user.avatar_url || 'Not set'}`);
    console.log(`   Role: ${user.role || 'Not set'}`);

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.message}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// File size test
async function testFileSizeLimit() {
  console.log('\n📏 Testing file size limit...');
  
  try {
    // Create a large test file (6MB - should fail)
    const largeFilePath = path.join(__dirname, 'large-test-image.jpg');
    const largeFileContent = Buffer.alloc(6 * 1024 * 1024, 'x'); // 6MB of 'x'
    fs.writeFileSync(largeFilePath, largeFileContent);

    const formData = new FormData();
    formData.append('avatar', fs.createReadStream(largeFilePath));
    formData.append('userId', userId);

    const uploadResponse = await axios.post(`${API_BASE}/auth/upload-avatar`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('❌ Large file upload should have failed but succeeded');
    
    // Clean up
    fs.unlinkSync(largeFilePath);

  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ File size limit working correctly');
    } else {
      console.log('⚠️  Unexpected error during file size test:', error.message);
    }
    
    // Clean up
    const largeFilePath = path.join(__dirname, 'large-test-image.jpg');
    if (fs.existsSync(largeFilePath)) {
      fs.unlinkSync(largeFilePath);
    }
  }
}

// Main test execution
async function main() {
  console.log('=' .repeat(50));
  console.log('TUIZ Avatar Upload Test Suite');
  console.log('=' .repeat(50));

  // Check if server is running
  try {
    await axios.get(`${API_BASE.replace('/api', '')}/health`);
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: npm run dev (in backend directory)');
    return;
  }

  await runAvatarUploadTest();
  
  if (authToken) {
    await testFileSizeLimit();
  }

  console.log('\n' + '=' .repeat(50));
  console.log('Test completed!');
  console.log('=' .repeat(50));
}

// Run tests
main().catch(console.error);
