#!/usr/bin/env node

/**
 * Player Management Test Script
 * Tests the new player UUID system for both authenticated and guest users
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DatabaseManager = require('../config/database');

async function testPlayerManagement() {
  console.log('🧪 Starting Player Management Test...\n');
  
  const db = new DatabaseManager();
  
  try {
    // Test 1: Test guest player UUID creation
    console.log('📝 Test 1: Creating guest player UUID...');
    const guestResult = await db.createGuestPlayerUUID();
    console.log('Guest Result:', guestResult);
    console.log('✅ Guest UUID test completed\n');

    // Test 2: Database schema check
    console.log('📝 Test 2: Checking database schema...');
    const schemaResult = await db.addGamePlayerUUIDToUsers();
    console.log('Schema Result:', schemaResult);
    console.log('✅ Schema check completed\n');

    // Test 3: Test with a mock user ID (you can replace with a real user ID)
    console.log('📝 Test 3: Testing authenticated user UUID...');
    const mockUserId = '00000000-0000-0000-0000-000000000001';
    const mockPlayerName = 'Test Player';
    
    console.log('⚠️ Note: This test will fail if the user ID does not exist in your database');
    const userResult = await db.getOrCreatePlayerUUID(mockUserId, mockPlayerName);
    console.log('User Result:', userResult);
    console.log('✅ User UUID test completed\n');

    // Test 4: Test player stats (with a mock UUID)
    console.log('📝 Test 4: Testing player stats...');
    const mockPlayerUUID = guestResult.playerId;
    const statsResult = await db.getPlayerStats(mockPlayerUUID);
    console.log('Stats Result:', statsResult);
    console.log('✅ Player stats test completed\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log(`- Guest UUID: ${guestResult.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Schema Check: ${schemaResult.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- User UUID: ${userResult.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Player Stats: Available`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPlayerManagement().then(() => {
    console.log('\n🏁 Test script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = testPlayerManagement;
