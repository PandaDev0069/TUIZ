/**
 * PostQuestionDisplay Data Structure
 * 
 * Clean, unified interface for all post-question display scenarios
 */

/**
 * Display Data Structure - Single object containing all needed information
 * 
 * @typedef {Object} DisplayData
 * @property {number} duration - Display duration in milliseconds (5000 for leaderboard-only, 30000 for explanations)
 * @property {ExplanationData|null} explanation - Explanation content (null if no explanation)
 * @property {LeaderboardData} leaderboard - Leaderboard and player data (always present)
 */

/**
 * Explanation Data - Content for explanation display
 * 
 * @typedef {Object} ExplanationData
 * @property {string|null} title - Explanation title (optional)
 * @property {string|null} text - Explanation text content (optional)
 * @property {string|null} image_url - Explanation image URL (optional)
 */

/**
 * Leaderboard Data - Player standings and statistics
 * 
 * @typedef {Object} LeaderboardData
 * @property {CurrentPlayerData} currentPlayer - Current player's performance data
 * @property {PlayerStanding[]} standings - Top player standings
 * @property {string} correctAnswer - The correct answer text
 * @property {string} correctOption - The correct option text
 * @property {AnswerStats} answerStats - Answer distribution statistics
 */

/**
 * Current Player Data - Individual player performance
 * 
 * @typedef {Object} CurrentPlayerData
 * @property {string} name - Player name
 * @property {number} score - Total score
 * @property {number} streak - Current streak count
 * @property {boolean} isCorrect - Whether this question was answered correctly
 * @property {number} questionScore - Points earned for this question
 */

/**
 * Player Standing - Individual player in leaderboard
 * 
 * @typedef {Object} PlayerStanding
 * @property {string} name - Player name
 * @property {number} score - Player's total score
 * @property {number} rank - Player's current rank
 * @property {number} streak - Player's current streak
 */

/**
 * Answer Statistics - Question answer distribution
 * 
 * @typedef {Object} AnswerStats
 * @property {number} correctPercentage - Percentage of players who answered correctly
 */

/**
 * Example Usage:
 * 
 * // Scenario 1: Question with explanation
 * const displayDataWithExplanation = {
 *   duration: 30000,
 *   explanation: {
 *     title: "なぜパリが正解なのか",
 *     text: "パリはフランスの首都であり、政治・経済・文化の中心地です。",
 *     image_url: "https://example.com/paris.jpg"
 *   },
 *   leaderboard: {
 *     currentPlayer: {
 *       name: "プレイヤー1",
 *       score: 1200,
 *       streak: 3,
 *       isCorrect: true,
 *       questionScore: 150
 *     },
 *     standings: [
 *       { name: "プレイヤー2", score: 1300, rank: 1, streak: 2 },
 *       { name: "プレイヤー1", score: 1200, rank: 2, streak: 3 }
 *     ],
 *     correctAnswer: "パリ",
 *     correctOption: "A. パリ",
 *     answerStats: { correctPercentage: 75 }
 *   }
 * };
 * 
 * // Scenario 2: Question without explanation (leaderboard-only)
 * const displayDataLeaderboardOnly = {
 *   duration: 5000,
 *   explanation: null,
 *   leaderboard: {
 *     currentPlayer: { ... },
 *     standings: [ ... ],
 *     correctAnswer: "東京",
 *     correctOption: "B. 東京",
 *     answerStats: { correctPercentage: 82 }
 *   }
 * };
 * 
 * // Usage in component:
 * <PostQuestionDisplay 
 *   displayData={displayDataWithExplanation}
 *   onComplete={() => console.log('Display completed')}
 * />
 */

export default {};
