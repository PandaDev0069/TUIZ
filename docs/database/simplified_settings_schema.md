// Simplified Game Settings Schema
// Based on current DB structure and essential gameplay features

// ESSENTIAL GAME SETTINGS (Cleaned up from current JSON)
{
  // PLAYER MANAGEMENT
  "maxPlayers": 50,              // From: maxPlayers, players_cap (remove duplicate)
  
  // GAME FLOW
  "autoAdvance": true,           // Auto move to next question when time up
  "showExplanations": true,      // Show explanations after each question  
  "explanationTime": 30,         // How long to show explanations (seconds)
  "showLeaderboard": true,       // Show leaderboard between questions
  
  // SCORING
  "pointCalculation": "fixed",   // "fixed", "time-bonus" 
  "streakBonus": false,          // Bonus for consecutive correct answers
  
  // DISPLAY OPTIONS
  "showProgress": true,          // Show "Question X of Y"
  "showCorrectAnswer": true,     // Highlight correct answer after time up
  
  // ADVANCED (Keep minimal)
  "spectatorMode": true,         // Allow non-players to watch
  "allowAnswerChange": false     // Allow players to change answers before time up
}

// REMOVED/SIMPLIFIED FROM CURRENT JSON:
// - timeLimit: Moved to questions table ✅
// - players_cap: Duplicate of maxPlayers ✅
// - game_settings: Nested duplication ✅
// - breakDuration: Not essential for MVP ✅
// - questionOrder, customQuestionOrder: Can add later ✅
// - answerOrder: Can add later ✅
// - autoStart, allowReplay: Game control, not settings ✅
// - kickInactive, inactiveTimeout: Can add later ✅
// - allowLateSubmissions: Can add later ✅
// - wrongAnswerPenalty: Can add later ✅
