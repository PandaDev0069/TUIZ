#!/usr/bin/env node

/**
 * Test the new per-second time bonus system
 */

const { calculateScore, getScoreBreakdown } = require('./utils/scoringSystem');

console.log('🕒 Per-Second Time Bonus System Test');
console.log('=====================================');

const gameSettings = { 
  streakBonus: true,
  pointCalculation: 'time-bonus'
};

console.log('Testing 200-point question with 10-second time limit:');
console.log('Formula: 1% of base points per second saved (capped at 50%)');
console.log('');

// Test different answer speeds
const testCases = [
  { timeTaken: 1, description: 'Lightning fast (1s)' },
  { timeTaken: 3, description: 'Very quick (3s)' },
  { timeTaken: 5, description: 'Quick (5s)' },
  { timeTaken: 7, description: 'Good timing (7s)' },
  { timeTaken: 9, description: 'Just made it (9s)' },
  { timeTaken: 10, description: 'Used full time (10s)' }
];

testCases.forEach(test => {
  const breakdown = getScoreBreakdown({
    basePoints: 200,
    streakCount: 0,
    timeTaken: test.timeTaken,
    timeLimit: 10,
    gameSettings
  });
  
  const secondsSaved = Math.max(0, 10 - test.timeTaken);
  const expectedBonus = Math.min(secondsSaved * 2, 100); // 2 points per second for 200 base
  
  console.log(`${test.description}:`);
  console.log(`  ⏱️  Seconds saved: ${secondsSaved}`);
  console.log(`  💰 Time bonus: +${breakdown.timeBonus} points`);
  console.log(`  🏆 Total score: ${breakdown.finalScore} points`);
  console.log(`  📝 ${breakdown.timeBonusDescription}`);
  console.log('');
});

console.log('🎯 Testing with different difficulty levels:');
console.log('============================================');

const difficulties = [
  { name: 'Easy', points: 100 },
  { name: 'Medium', points: 200 },
  { name: 'Hard', points: 300 }
];

difficulties.forEach(diff => {
  const breakdown = getScoreBreakdown({
    basePoints: diff.points,
    streakCount: 0,
    timeTaken: 3, // 3 seconds on 10s question = 7 seconds saved
    timeLimit: 10,
    gameSettings
  });
  
  console.log(`${diff.name} (${diff.points} base): +${breakdown.timeBonus} time bonus → ${breakdown.finalScore} total`);
});

console.log('');
console.log('✅ Per-Second System Benefits:');
console.log('  • Granular rewards - every second matters');
console.log('  • Fair scaling with question difficulty');
console.log('  • No arbitrary percentage thresholds');
console.log('  • Capped at 50% to prevent extreme scores');
console.log('  • Clear feedback showing seconds saved');
