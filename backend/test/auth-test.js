// Test script to verify authentication fixes
const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test data
const testUser = {
  email: 'authtest@example.com',
  username: 'authtest',
  password: 'testpass123',
  confirmPassword: 'testpass123'
};

const existingUser = {
  email: 'test@gmail.com',
  password: 'testpass123'
};

async function testAuth() {
  console.log('🧪 Starting Authentication Tests...\n');

  try {
    // Test 1: Register new user
    console.log('1️⃣ Testing user registration...');
    try {
      const registerResponse = await axios.post(`${API_BASE}/api/auth/register`, testUser);
      console.log('✅ Registration successful:', {
        success: registerResponse.data.success,
        userId: registerResponse.data.user?.id,
        email: registerResponse.data.user?.email,
        username: registerResponse.data.user?.username
      });
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('既に使用されています')) {
        console.log('ℹ️ User already exists (expected if running test multiple times)');
      } else {
        console.error('❌ Registration failed:', error.response?.data || error.message);
      }
    }

    // Test 2: Login with existing user
    console.log('\n2️⃣ Testing user login...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        emailOrUsername: existingUser.email,
        password: existingUser.password
      });
      console.log('✅ Login successful:', {
        success: loginResponse.data.success,
        userId: loginResponse.data.user?.id,
        email: loginResponse.data.user?.email,
        username: loginResponse.data.user?.username
      });

      // Test 3: Access protected route
      console.log('\n3️⃣ Testing protected route access...');
      const token = loginResponse.data.token;
      const profileResponse = await axios.get(`${API_BASE}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✅ Profile access successful:', {
        success: profileResponse.data.success,
        userId: profileResponse.data.user?.id
      });

    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
    }

    // Test 4: Check availability
    console.log('\n4️⃣ Testing availability check...');
    try {
      const availabilityResponse = await axios.post(`${API_BASE}/api/auth/check-availability`, {
        email: 'newuser@example.com',
        username: 'newuser'
      });
      console.log('✅ Availability check successful:', availabilityResponse.data.availability);
    } catch (error) {
      console.error('❌ Availability check failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ General test error:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/`);
    console.log('✅ Server is responding\n');
    return true;
  } catch (error) {
    console.error('❌ Server is not responding. Make sure to start the backend server first.');
    console.error('Run: npm start in the backend directory\n');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAuth();
  }
  console.log('\n🏁 Tests completed');
}

main().catch(console.error);
