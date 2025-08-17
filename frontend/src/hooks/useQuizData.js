import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for fetching and managing quiz data for previews and games
 * @param {string} questionSetId - UUID of the question set
 * @param {string} gameId - Optional game ID for active game data
 * @returns {Object} Quiz data and loading states
 */
export const useQuizData = (questionSetId, gameId = null) => {
  const { apiCall } = useAuth();
  
  // Data states
  const [questions, setQuestions] = useState([]);
  const [gameSettings, setGameSettings] = useState(null);
  const [questionSetMetadata, setQuestionSetMetadata] = useState(null);
  const [gameData, setGameData] = useState(null);
  
  // Loading states
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingGameData, setLoadingGameData] = useState(false);
  
  // Error states
  const [questionsError, setQuestionsError] = useState(null);
  const [settingsError, setSettingsError] = useState(null);
  const [gameDataError, setGameDataError] = useState(null);

  /**
   * Fetch questions for the question set
   */
  const fetchQuestions = useCallback(async () => {
    if (!questionSetId || !apiCall) return;

    try {
      setLoadingQuestions(true);
      setQuestionsError(null);

      const response = await apiCall(`/quiz/${questionSetId}/questions`);
      
      if (response.success && response.questions) {
        // Transform questions to match game format
        const transformedQuestions = response.questions.map((question, index) => ({
          id: question.id,
          question: question.question_text,
          type: question.question_type || 'multiple_choice',
          options: question.answers ? 
            question.answers
              .sort((a, b) => a.order_index - b.order_index)
              .map(answer => ({
                id: answer.id,
                text: answer.answer_text,
                isCorrect: answer.is_correct,
                explanation: answer.answer_explanation,
                imageUrl: answer.image_url || null
              })) : [],
          timeLimit: (question.time_limit || 30) * 1000, // Convert to milliseconds
          points: question.points || 100,
          questionNumber: index + 1,
          explanation: {
            title: question.explanation_title || '',
            text: question.explanation_text || '',
            imageUrl: question.explanation_image_url || null
          },
          imageUrl: question.image_url || null,
          difficulty: question.difficulty || 'medium'
        }));

        setQuestions(transformedQuestions);
        console.log(`✅ Loaded ${transformedQuestions.length} questions for preview`);
      } else {
        throw new Error(response.message || 'Failed to fetch questions');
      }
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      setQuestionsError(error.message);
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [questionSetId, apiCall]);

  /**
   * Fetch game settings for the question set
   */
  const fetchGameSettings = useCallback(async () => {
    if (!questionSetId || !apiCall) return;

    try {
      setLoadingSettings(true);
      setSettingsError(null);

      const endpoint = gameId ? 
        `/game-settings/game/${gameId}` : 
        `/game-settings/${questionSetId}`;

      const response = await apiCall(endpoint);
      
      if (response.success) {
        setGameSettings(response.settings);
        setQuestionSetMetadata({
          id: response.questionSetId,
          title: response.questionSetTitle || 'Quiz Preview',
          totalQuestions: questions.length
        });
      } else {
        throw new Error(response.error || 'Failed to fetch game settings');
      }
    } catch (error) {
      console.error('❌ Error fetching game settings:', error);
      setSettingsError(error.message);
      setGameSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  }, [questionSetId, gameId, apiCall, questions.length]);

  /**
   * Fetch active game data if gameId is provided
   */
  const fetchGameData = useCallback(async () => {
    if (!gameId || !apiCall) return;

    try {
      setLoadingGameData(true);
      setGameDataError(null);

      // Only fetch game data for actual active games
      // Skip if gameId looks like a preview or non-active game
      if (gameId === 'preview' || gameId === 'demo') {
        setGameData(null);
        return;
      }

      const response = await apiCall(`/games/${gameId}`);
      
      if (response.game) {
        setGameData(response.game);
        console.log('✅ Loaded live game data:', response.game);
      } else {
        throw new Error('Game not found');
      }
    } catch (error) {
      // Silently handle game data errors for preview mode
      // This is expected when gameId doesn't correspond to an active game
      if (import.meta.env.DEV && !error.message.includes('404')) {
        console.log('ℹ️ Game data not available (preview mode):', error.message);
      }
      setGameDataError(null); // Don't treat this as an error in preview
      setGameData(null);
    } finally {
      setLoadingGameData(false);
    }
  }, [gameId, apiCall]);

  /**
   * Get current question based on game state
   */
  const getCurrentQuestion = useCallback((currentQuestionIndex = 0) => {
    if (!questions.length) return null;
    
    const index = Math.max(0, Math.min(currentQuestionIndex, questions.length - 1));
    return questions[index];
  }, [questions]);

  /**
   * Get preview question (cycles through questions for demo)
   */
  const getPreviewQuestion = useCallback((previewIndex = 0) => {
    if (!questions.length) return null;
    
    const index = previewIndex % questions.length;
    return questions[index];
  }, [questions]);

  /**
   * Get leaderboard data (combines real game data with mock for preview)
   */
  const getLeaderboardData = useCallback(() => {
    if (gameData && gameData.players) {
      // Use real game data
      return gameData.players
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((player, index) => ({
          rank: index + 1,
          name: player.name,
          score: player.score,
          isConnected: player.isConnected
        }));
    } else {
      // Generate mock leaderboard for preview
      const mockPlayers = [
        { name: 'Player 1', score: 850 },
        { name: 'Player 2', score: 720 },
        { name: 'Player 3', score: 680 },
        { name: 'Player 4', score: 540 },
        { name: 'Player 5', score: 420 }
      ];
      
      return mockPlayers.map((player, index) => ({
        rank: index + 1,
        name: player.name,
        score: player.score,
        isConnected: true
      }));
    }
  }, [gameData]);

  // Effect to fetch questions when questionSetId changes
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Effect to fetch settings after questions are loaded
  useEffect(() => {
    if (questions.length > 0) {
      fetchGameSettings();
    }
  }, [questions.length, fetchGameSettings]);

  // Effect to fetch game data when gameId changes
  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [fetchGameData]);

  // Computed loading state
  const isLoading = loadingQuestions || loadingSettings || loadingGameData;
  
  // Computed error state - only show critical errors (questions/settings)
  // Game data errors are expected in preview mode
  const hasError = questionsError || settingsError;
  const errorMessage = questionsError || settingsError;

  return {
    // Data
    questions,
    gameSettings,
    questionSetMetadata,
    gameData,
    
    // Helper functions
    getCurrentQuestion,
    getPreviewQuestion,
    getLeaderboardData,
    
    // Loading states
    isLoading,
    loadingQuestions,
    loadingSettings,
    loadingGameData,
    
    // Error states
    hasError,
    errorMessage,
    questionsError,
    settingsError,
    gameDataError,
    
    // Refresh functions
    refetchQuestions: fetchQuestions,
    refetchSettings: fetchGameSettings,
    refetchGameData: fetchGameData
  };
};

export default useQuizData;
