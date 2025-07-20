import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import MetadataForm from '../components/MetadataForm';
import './createQuiz.css';

function CreateQuiz() {
  const { user, isAuthenticated } = useAuth();
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
  const [questions, setQuestions] = useState([]);

  // Quiz settings state
  const [settings, setSettings] = useState({
    timeLimit: 30,
    showCorrectAnswer: true,
    randomizeQuestions: false,
    randomizeAnswers: true,
    allowReplay: false,
  });

  const stepTitles = [
    "📋 基本情報",
    "❓ 問題作成", 
    "⚙️ 設定",
    "🎯 確認・保存"
  ];

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
    // TODO: Implement quiz saving logic
    console.log('Saving quiz...', { metadata, questions, settings });
    // Navigate back to dashboard
    navigate('/dashboard');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return metadata.title.trim().length > 0;
      case 2:
        return questions.length > 0;
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
              <div className="step-content">
                <h2 className="step-title">❓ 問題作成</h2>
                <p className="step-description">準備中...</p>
                {/* TODO: Implement QuestionForm component */}
              </div>
            )}

            {currentStep === 3 && (
              <div className="step-content">
                <h2 className="step-title">⚙️ クイズ設定</h2>
                <p className="step-description">準備中...</p>
                {/* TODO: Implement SettingsForm component */}
              </div>
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
                disabled={!canProceed()}
              >
                保存して完了
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default CreateQuiz;
