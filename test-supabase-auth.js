#!/usr/bin/env node

/**
 * TUIZ Supabase Auth Migration Test Script
 * 
 * This script tests the new Supabase authentication system
 * Run with: node test-supabase-auth.js
 */

const jwt = require('jsonwebtoken');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';
const TEST_NAME = 'TestUser';

// Helper function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { response, data };
}

// Test functions
async function testAuthInfo() {
  console.log('🔍 Testing auth info endpoint...');
  try {
    const { response, data } = await makeRequest('/api/debug/auth-info');
    
    if (response.ok) {
      console.log('✅ Auth info retrieved successfully');
      console.log('📋 Auth Type:', data.authType);
      console.log('📋 Description:', data.description);
      console.log('📋 Supabase Configured:', JSON.stringify(data.supabaseConfigured, null, 2));
      return true;
    } else {
      console.log('❌ Failed to get auth info:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Auth info test failed:', error.message);
    return false;
  }
}

async function testRegistration() {
  console.log('🔍 Testing user registration...');
  try {
    const { response, data } = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        name: TEST_NAME,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD
      })
    });
    
    if (response.ok) {
      console.log('✅ Registration successful');
      console.log('👤 User ID:', data.user.id);
      console.log('📧 Email:', data.user.email);
      console.log('🏷️  Name:', data.user.name);
      console.log('🎫 Token received:', !!data.token);
      
      if (data.token) {
        console.log('🔍 Token length:', data.token.length);
        
        // Try to decode token
        try {
          const decoded = jwt.decode(data.token, { complete: true });
          console.log('📋 Token header:', JSON.stringify(decoded.header, null, 2));
          console.log('📋 Token payload (partial):', JSON.stringify({
            sub: decoded.payload.sub,
            email: decoded.payload.email,
            aud: decoded.payload.aud,
            role: decoded.payload.role,
            iss: decoded.payload.iss?.substring(0, 50) + '...'
          }, null, 2));
        } catch (decodeError) {
          console.log('⚠️  Failed to decode token:', decodeError.message);
        }
      }
      
      return data.token;
    } else {
      console.log('❌ Registration failed:', data.message || data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Registration test failed:', error.message);
    return null;
  }
}

async function testLogin() {
  console.log('🔍 Testing user login...');
  try {
    const { response, data } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        emailOrName: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    if (response.ok) {
      console.log('✅ Login successful');
      console.log('👤 User ID:', data.user.id);
      console.log('📧 Email:', data.user.email);
      console.log('🏷️  Name:', data.user.name);
      console.log('🎫 Token received:', !!data.token);
      return data.token;
    } else {
      console.log('❌ Login failed:', data.message || data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
    return null;
  }
}

async function testTokenVerification(token) {
  console.log('🔍 Testing token verification...');
  try {
    const { response, data } = await makeRequest('/api/debug/verify-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Token verification successful');
      console.log('👤 Verified user:', data.user.name, '(' + data.user.email + ')');
      console.log('🔖 Token type:', data.tokenType);
      console.log('📋 Token info:', JSON.stringify(data.tokenInfo, null, 2));
      return true;
    } else {
      console.log('❌ Token verification failed:', data.error);
      console.log('💡 Suggestions:', data.suggestions);
      return false;
    }
  } catch (error) {
    console.log('❌ Token verification test failed:', error.message);
    return false;
  }
}

async function testProfile(token) {
  console.log('🔍 Testing profile endpoint...');
  try {
    const { response, data } = await makeRequest('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Profile retrieved successfully');
      console.log('👤 Profile:', JSON.stringify(data.user, null, 2));
      return true;
    } else {
      console.log('❌ Profile retrieval failed:', data.message || data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Profile test failed:', error.message);
    return false;
  }
}

async function testQuestionSetCreation(token) {
  console.log('🔍 Testing question set creation (with Supabase auth)...');
  try {
    const { response, data } = await makeRequest('/api/question-sets/metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Test Quiz from Supabase Auth',
        description: 'Testing Supabase JWT authentication',
        category: 'test',
        difficulty_level: 'easy',
        is_public: false,
        estimated_duration: 5
      })
    });
    
    if (response.ok) {
      console.log('✅ Question set creation successful');
      console.log('📝 Question set ID:', data.id);
      console.log('📝 Title:', data.title);
      console.log('👤 Created by user:', data.user_id);
      return true;
    } else {
      console.log('❌ Question set creation failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Question set creation test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Supabase Auth Migration Tests...\n');
  
  const results = {};
  
  // Test 1: Auth Info
  results.authInfo = await testAuthInfo();
  console.log('');
  
  // Test 2: Registration
  const registrationToken = await testRegistration();
  results.registration = !!registrationToken;
  console.log('');
  
  // Test 3: Login
  const loginToken = await testLogin();
  results.login = !!loginToken;
  console.log('');
  
  const token = loginToken || registrationToken;
  
  if (token) {
    // Test 4: Token Verification
    results.tokenVerification = await testTokenVerification(token);
    console.log('');
    
    // Test 5: Profile
    results.profile = await testProfile(token);
    console.log('');
    
    // Test 6: Question Set Creation (the main issue we were fixing)
    results.questionSetCreation = await testQuestionSetCreation(token);
    console.log('');
  } else {
    console.log('⚠️  Skipping authenticated tests - no token available');
    results.tokenVerification = false;
    results.profile = false;
    results.questionSetCreation = false;
  }
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Supabase auth migration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Check if we're in a Node.js environment
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  global.fetch = fetch;
  runTests().catch(console.error);
} else {
  // Browser environment
  console.log('Run this script in Node.js environment: node test-supabase-auth.js');
}

module.exports = { runTests };
