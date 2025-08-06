#!/usr/bin/env node

/**
 * Test script to verify difficulty-based scoring system
 * Shows how host's difficulty-based point assignments work
 */

const { calculateGameScore } = require('./utils/scoringSystem');

console.log('🎯 TUIZ Difficulty-Based Scoring System Test');
console.log('============================================');
console.log('');

console.log('📚 Host Question Difficulty Assignment:');
console.log('  💚 Easy Questions:   100 base points');
console.log('  💛 Medium Questions: 200 base points'); 
console.log('  ❤️ Hard Questions:   300 base points');
console.log('');

// Test game settings
const gameSettings = { 
  streakBonus: true,
  pointCalculation: 'time-bonus'
};

// Simulate a game with questions of different difficulties
const questions = [
  { 
    name: '富士山は日本で一番高い山である', 
    points: 100,  // Easy - Basic knowledge
    time_limit: 10,
    difficulty: 'Easy'
  },
  { 
    name: '日本の首都はどこですか？', 
    points: 200,  // Medium - Requires some knowledge
    time_limit: 10,
    difficulty: 'Medium'
  },
  { 
    name: '日本で一番大きい湖は？', 
    points: 300,  // Hard - Expert knowledge
    time_limit: 20,
    difficulty: 'Hard'
  }
];

console.log('🎮 Game Simulation (Player answering quickly with streak):');
console.log('========================================================');

let player = { streak: 0 };

questions.forEach((question, index) => {
  console.log(`\nQuestion ${index + 1}: ${question.name}`);
  console.log(`${question.difficulty} Level → ${question.points} base points (Current streak: ${player.streak})`);
  
  // Simulate quick answer (3 seconds)
  const result = calculateGameScore({
    question,
    gameSettings,
    player,
    timeTaken: 3,
    isCorrect: true
  });
  
  console.log(`🏆 Final Score: ${result.points} points`);
  console.log(`   📊 Breakdown:`);
  console.log(`     • Base (difficulty): ${result.breakdown.breakdown.base} pts`);
  console.log(`     • Streak bonus: +${result.breakdown.breakdown.streak} pts`);
  console.log(`     • Time bonus: +${result.breakdown.breakdown.time} pts`);
  
  // Update player streak for next question (the new streak after this correct answer)
  player.streak = result.newStreak;
});

console.log('');
console.log('✅ Key Benefits:');
console.log('  🎯 Host can reward difficulty with base points');
console.log('  🔥 Streak and time bonuses scale with difficulty');
console.log('  ⚖️ Fair scoring that rewards both skill and knowledge');
console.log('');
console.log('💡 Result: Harder questions give proportionally higher rewards!');
