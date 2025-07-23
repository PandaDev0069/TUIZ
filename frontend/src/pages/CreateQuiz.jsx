import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import MetadataForm from '../components/MetadataForm';
import QuestionsForm from '../components/QuestionsForm';
import SettingsForm from '../components/SettingsForm';
import QuestionReorderModal from '../components/QuestionReorderModal';
import './createQuiz.css';

function CreateQuiz() {
  const { user, isAuthenticated, token, apiCall } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Quiz creation steps
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Quiz metadata state
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    coverImage: "",
    coverImageFile: null,
    tags: "",
    visibility: "private",
  });

  // Quiz questions state
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      text: "",
      image: "",
      imageFile: null,
      timeLimit: 10,
      points: "standard",
      answers: [
        { id: Date.now() + 1, text: "", isCorrect: false, image: "", imageFile: null },
        { id: Date.now() + 2, text: "", isCorrect: false, image: "", imageFile: null },
      ],
    },
  ]);

  // Quiz settings state
  const [settings, setSettings] = useState({
    // Timing & Flow
    timeLimit: 30,
    breakDuration: 3,
    autoAdvance: true,
    
    // Question & Answer Ordering
    questionOrder: "original", // "original", "random-all", "random-per-player", "custom"
    customQuestionOrder: [],
    answerOrder: "original", // "original", "randomize", "lock-first", "lock-last"
    
    // Gameplay Behavior
    showCorrectAnswer: true,
    showExplanations: true,
    allowAnswerChange: true,
    allowLateSubmissions: false,
    
    // Scoring & Points
    pointCalculation: "fixed", // "fixed", "time-bonus"
    streakBonus: false,
    wrongAnswerPenalty: false,
    
    // Player Experience
    showLeaderboard: true,
    showProgress: true,
    allowReplay: false,
    spectatorMode: true,
    
    // Advanced Options
    maxPlayers: 50,
    autoStart: false,
    kickInactive: false,
    inactiveTimeout: 30
  });

  // Modal states for advanced features
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const stepTitles = [
    "📋 基本情報",
    "❓ 問題作成", 
    "⚙️ 設定",
    "🎯 確認・保存"
  ];

  // Comprehensive validation function
  const validateQuizData = (metadata, questions, settings) => {
    const errors = [];
    
    // Validate metadata
    if (!metadata.title?.trim()) {
      errors.push('Title is required');
    }
    if (metadata.title?.trim().length > 255) {
      errors.push('Title must be less than 255 characters');
    }
    
    // Validate questions
    if (questions.length === 0) {
      errors.push('At least one question is required');
    }
    
    questions.forEach((question, index) => {
      if (!question.text?.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }
      if (question.text?.trim().length > 1000) {
        errors.push(`Question ${index + 1}: Question text must be less than 1000 characters`);
      }
      if (question.timeLimit < 5 || question.timeLimit > 300) {
        errors.push(`Question ${index + 1}: Time limit must be between 5 and 300 seconds`);
      }
      
      // Validate answers
      if (question.answers.length < 2) {
        errors.push(`Question ${index + 1}: At least 2 answers are required`);
      }
      
      const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
      if (!hasCorrectAnswer) {
        errors.push(`Question ${index + 1}: At least one correct answer is required`);
      }
      
      question.answers.forEach((answer, answerIndex) => {
        if (!answer.text?.trim()) {
          errors.push(`Question ${index + 1}, Answer ${answerIndex + 1}: Answer text is required`);
        }
        if (answer.text?.trim().length > 500) {
          errors.push(`Question ${index + 1}, Answer ${answerIndex + 1}: Answer text must be less than 500 characters`);
        }
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveQuiz = async () => {
    try {
      setIsLoading(true);
      console.log('Starting quiz save process...');
      
      // Step 1: Validate all data thoroughly
      const validationResult = validateQuizData(metadata, questions, settings);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      // Step 2: Prepare metadata first
      const questionSetMetadata = {
        title: metadata.title.trim(),
        description: metadata.description?.trim() || '',
        category: extractCategoryFromTags(metadata.tags),
        difficulty_level: calculateDifficulty(questions),
        is_public: metadata.visibility === 'public',
        estimated_duration: calculateEstimatedDuration(questions, settings)
      };

      console.log('Step 1 - Question Set Metadata:', questionSetMetadata);

      // Step 3: Create question set first (without questions) using apiCall
      const questionSetResult = await apiCall('/question-sets/metadata', {
        method: 'POST',
        body: JSON.stringify(questionSetMetadata)
      });

      const questionSetId = questionSetResult.id;
      console.log('Step 2 - Question Set Created:', questionSetId);

      // Step 4: Add questions one by one with proper validation
      const savedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`Step 3.${i + 1} - Processing question ${i + 1}:`, question.text.substring(0, 50) + '...');
        
        const questionData = {
          question_set_id: questionSetId,
          question_text: question.text.trim(),
          question_type: determineQuestionType(question),
          time_limit: question.timeLimit,
          points: getPointsValue(question.points),
          difficulty: 'medium',
          order_index: i,
          explanation: question.explanation || ''
        };

        const savedQuestion = await apiCall('/questions', {
          method: 'POST',
          body: JSON.stringify(questionData)
        });

        savedQuestions.push(savedQuestion);
        console.log(`Question ${i + 1} saved with ID:`, savedQuestion.id);

        // Step 5: Add answers for this question
        for (let j = 0; j < question.answers.length; j++) {
          const answer = question.answers[j];
          console.log(`Step 4.${i + 1}.${j + 1} - Processing answer ${j + 1}:`, answer.text.substring(0, 30) + '...');
          
          const answerData = {
            question_id: savedQuestion.id,
            answer_text: answer.text.trim(),
            is_correct: answer.isCorrect,
            order_index: j
          };

          const savedAnswer = await apiCall('/answers', {
            method: 'POST',
            body: JSON.stringify(answerData)
          });

          console.log(`Answer ${j + 1} for question ${i + 1} saved with ID:`, savedAnswer.id);
        }
      }

      console.log('Step 6 - All questions and answers saved successfully');
      
      // Step 6: Final update to question set with total count
      try {
        await apiCall(`/question-sets/${questionSetId}/finalize`, {
          method: 'PATCH',
          body: JSON.stringify({
            total_questions: questions.length,
            settings: settings
          })
        });
      } catch (finalizeError) {
        console.warn('Failed to finalize question set, but quiz was saved:', finalizeError);
      }

      console.log('Quiz creation completed successfully!');
      alert('クイズが正常に保存されました！');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('クイズの保存に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract category from tags
  const extractCategoryFromTags = (tags) => {
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    return tagArray.length > 0 ? tagArray[0] : 'general';
  };

  // Helper function to calculate difficulty based on questions
  const calculateDifficulty = (questions) => {
    const avgTimeLimit = questions.reduce((sum, q) => sum + q.timeLimit, 0) / questions.length;
    const hasComplexQuestions = questions.some(q => q.answers.length > 4 || q.text.length > 200);
    
    if (avgTimeLimit < 10 && hasComplexQuestions) return 'hard';
    if (avgTimeLimit < 15 || hasComplexQuestions) return 'medium';
    return 'easy';
  };

  // Helper function to calculate estimated duration
  const calculateEstimatedDuration = (questions, settings) => {
    const questionTime = questions.reduce((sum, q) => sum + q.timeLimit, 0);
    const breakTime = (questions.length - 1) * settings.breakDuration;
    return Math.ceil((questionTime + breakTime) / 60); // Convert to minutes
  };

  // Helper function to format questions for database
  const formatQuestionsForDatabase = (questions) => {
    return questions.map((question, index) => ({
      question_text: question.text,
      question_type: determineQuestionType(question),
      time_limit: question.timeLimit,
      points: getPointsValue(question.points),
      difficulty: 'medium', // Default, could be calculated per question
      order_index: index,
      explanation: '', // Could be added to UI later
      answers: question.answers.map((answer, answerIndex) => ({
        answer_text: answer.text,
        is_correct: answer.isCorrect,
        order_index: answerIndex
      }))
    }));
  };

  // Helper function to determine question type
  const determineQuestionType = (question) => {
    if (question.answers.length === 2) {
      const texts = question.answers.map(a => a.text.toLowerCase().trim());
      if (texts.includes('true') && texts.includes('false') || 
          texts.includes('○') && texts.includes('×') ||
          texts.includes('はい') && texts.includes('いいえ')) {
        return 'true_false';
      }
    }
    return 'multiple_choice';
  };

  // Helper function to get numeric points value
  const getPointsValue = (pointsSetting) => {
    switch (pointsSetting) {
      case 'low': return 500;
      case 'standard': return 1000;
      case 'high': return 1500;
      case 'custom': return 1000; // Could allow custom input later
      default: return 1000;
    }
  };

  const handlePreviewQuiz = () => {
    // TODO: Implement preview modal functionality
    console.log('Preview quiz clicked - functionality not yet implemented');
    // setShowPreviewModal(true);
  };

  const handleReorderQuestions = () => {
    setShowReorderModal(true);
  };

  const handleReorderComplete = (newQuestions) => {
    setQuestions(newQuestions);
    // Automatically set question order to custom when reordering is used
    setSettings(prev => ({
      ...prev,
      questionOrder: 'custom',
      customQuestionOrder: newQuestions.map(q => q.id)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return metadata.title.trim().length > 0;
      case 2:
        // Check if all questions are valid
        return questions.length > 0 && questions.every(question => {
          const hasValidText = question.text.trim().length > 0;
          const hasValidAnswers = question.answers.every(a => a.text.trim().length > 0);
          const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
          return hasValidText && hasValidAnswers && hasCorrectAnswer;
        });
      case 3:
        return true; // Settings are optional
      case 4:
        return true; // Final review
      default:
        return false;
    }
  };

  if (!user) return null;

  return (
    <div className="create-quiz-container">
      <div className="create-quiz-content">
        {/* Header */}
        <header className="create-quiz-header">
          <div className="header-left">
            <button 
              className="back-button"
              onClick={() => navigate('/dashboard')}
            >
              ← ダッシュボードに戻る
            </button>
            <h1 className="page-title">クイズ作成</h1>
          </div>
          <div className="header-right">
            <span className="creator-info">
              作成者: {user.username}
            </span>
          </div>
        </header>

        {/* Progress Indicator */}
        <div className="progress-container">
          <div className="progress-steps">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;
              
              return (
                <div 
                  key={stepNumber}
                  className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="step-circle">
                    {isCompleted ? '✓' : stepNumber}
                  </div>
                  <span className="step-title">{title}</span>
                </div>
              );
            })}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="create-quiz-main">
          <div className="form-container">
            {currentStep === 1 && (
              <MetadataForm 
                metadata={metadata} 
                setMetadata={setMetadata}
              />
            )}

            {currentStep === 2 && (
              <QuestionsForm 
                questions={questions} 
                setQuestions={setQuestions}
              />
            )}

            {currentStep === 3 && (
              <SettingsForm 
                settings={settings} 
                setSettings={setSettings}
                questions={questions}
                onPreviewQuiz={handlePreviewQuiz}
                onReorderQuestions={handleReorderQuestions}
              />
            )}

            {currentStep === 4 && (
              <div className="step-content">
                <h2 className="step-title">🎯 確認・保存</h2>
                <p className="step-description">準備中...</p>
                {/* TODO: Implement ReviewForm component */}
              </div>
            )}
          </div>
        </main>

        {/* Navigation */}
        <footer className="create-quiz-footer">
          <div className="nav-buttons">
            <button 
              className="nav-button secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              前へ
            </button>
            
            <div className="step-indicator">
              {currentStep} / {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <button 
                className="nav-button primary"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                次へ
              </button>
            ) : (
              <button 
                className="nav-button primary save-button"
                onClick={handleSaveQuiz}
                disabled={!canProceed() || isLoading}
              >
                {isLoading ? '保存中...' : '保存して完了'}
              </button>
            )}
          </div>
        </footer>

        {/* Modals */}
        <QuestionReorderModal
          isOpen={showReorderModal}
          onClose={() => setShowReorderModal(false)}
          questions={questions}
          onReorder={handleReorderComplete}
        />
      </div>
    </div>
  );
}

export default CreateQuiz;
