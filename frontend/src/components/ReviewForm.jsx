import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import './reviewForm.css';

function ReviewForm({ 
  metadata, 
  questions, 
  settings, 
  questionSetId,
  onPublish,
  onReorderQuestions 
}) {
  const { apiCall } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Calculate quiz statistics
  const quizStats = {
    totalQuestions: questions.length,
    totalDuration: questions.reduce((sum, q) => sum + q.timeLimit, 0),
    averageTimePerQuestion: questions.length > 0 ? Math.round(questions.reduce((sum, q) => sum + q.timeLimit, 0) / questions.length) : 0,
    totalPoints: questions.reduce((sum, q) => sum + (q.points || 100), 0),
    difficultyDistribution: {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    },
    questionTypes: {
      multipleChoice: questions.filter(q => q.question_type === 'multiple_choice').length,
      trueFalse: questions.filter(q => q.question_type === 'true_false').length
    }
  };

  // Validate quiz data for publishing
  useEffect(() => {
    const errors = [];
    
    // Metadata validation
    if (!metadata.title?.trim()) errors.push('タイトルが設定されていません');
    if (!metadata.category) errors.push('カテゴリーが選択されていません');
    if (!metadata.difficulty_level) errors.push('難易度レベルが選択されていません');
    
    // Questions validation
    if (questions.length === 0) errors.push('問題が作成されていません');
    
    questions.forEach((question, index) => {
      if (!question.text?.trim()) {
        errors.push(`問題 ${index + 1}: 問題文が入力されていません`);
      }
      
      const hasValidAnswers = question.answers?.length >= 2;
      const hasCorrectAnswer = question.answers?.some(a => a.isCorrect);
      
      if (!hasValidAnswers) {
        errors.push(`問題 ${index + 1}: 選択肢が不足しています（最低2つ必要）`);
      }
      if (!hasCorrectAnswer) {
        errors.push(`問題 ${index + 1}: 正解が設定されていません`);
      }
    });
    
    setValidationErrors(errors);
  }, [metadata, questions]);



  // Helper function to safely get nested values from settings object
  const getSettingValue = (path, defaultValue = null) => {
    if (!settings) return defaultValue;
    
    const keys = path.split('.');
    let current = settings;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  };

  const handlePublish = async () => {
    if (validationErrors.length > 0) {
      showError('公開前にエラーを修正してください');
      return;
    }

    try {
      setIsPublishing(true);
      
      // Prepare publication data
      const publicationData = {
        play_settings: settings
      };

      console.log('Publishing quiz with data:', publicationData);
      
      const response = await apiCall(`/quiz/${questionSetId}/publish`, {
        method: 'PATCH',
        body: JSON.stringify(publicationData)
      });

      console.log('Publish response:', response);
      showSuccess('クイズが正常に公開されました！');
      
      if (onPublish) {
        onPublish();
      }
      
    } catch (error) {
      console.error('Publishing failed:', error);
      
      // Handle validation errors from backend
      if (error.validationErrors && error.validationErrors.length > 0) {
        const errorMessage = '公開に失敗しました:\n' + error.validationErrors.join('\n');
        showError(errorMessage);
      } else {
        showError('公開に失敗しました: ' + (error.message || '不明なエラーが発生しました'));
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds > 0 ? ` ${remainingSeconds}秒` : ''}`;
    }
    return `${remainingSeconds}秒`;
  };

  // Helper function to convert any value to boolean for display
  const getBooleanDisplay = (value, settingName = '') => {
    // Handle various truthy values
    if (value === true || value === 'true' || value === 1 || value === '1' || value === 'on') {
      return 'あり';
    }
    
    // Handle various falsy values explicitly
    if (value === false || value === 'false' || value === 0 || value === '0' || value === 'off' || value === null || value === undefined) {
      return 'なし';
    }
    
    // Default to なし for any other values
    return 'なし';
  };

  // Helper function to get boolean setting and display it
  const getBooleanSetting = (path, settingName = '') => {
    const value = getSettingValue(path);
    return getBooleanDisplay(value, settingName || path);
  };

  // Helper function to get string setting with fallback
  const getStringSetting = (path, defaultValue = '未設定') => {
    const value = getSettingValue(path);
    return value !== null ? value : defaultValue;
  };

  // Helper function to get number setting with fallback
  const getNumberSetting = (path, defaultValue = 0) => {
    const value = getSettingValue(path);
    return value !== null ? Number(value) : defaultValue;
  };

  return (
    <div className="review-form-container">
      <div className="review-step-content">
        <h2 className="review-step-title">🎯 最終確認・公開</h2>
        <p className="review-step-description">
          作成したクイズの内容を確認して、公開の準備をしましょう。
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="review-validation-errors">
          <h3>⚠️ 公開前に修正が必要な項目</h3>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="review-sections-container">
        {/* Section 1: Questions Overview */}
        <div className="review-main-section">
          <h3 className="review-section-header">
            <span className="review-section-icon">❓</span>
            問題一覧 ({questions.length}問)
          </h3>
          
          <div className="review-questions-overview">
            <div className="review-questions-header">
              <span>問題の順序と内容を確認できます</span>
              <button 
                className="review-reorder-button"
                onClick={onReorderQuestions}
                type="button"
              >
                🔄 順序を変更
              </button>
            </div>
            
            <div className="review-questions-list">
              {questions.map((question, index) => (
                <div key={question.id} className="review-question-item">
                  <div className="review-question-badges">
                    <span className="review-question-number">Q{index + 1}</span>
                    <span className="review-question-type">
                      {question.question_type === 'true_false' ? '○×問題' : '選択問題'}
                    </span>
                    <span 
                      className="review-question-difficulty"
                      style={{ color: getDifficultyColor(question.difficulty) }}
                    >
                      {question.difficulty === 'easy' ? '易' : 
                       question.difficulty === 'medium' ? '中' : '難'}
                    </span>
                    <span className="review-question-time">{question.timeLimit}秒</span>
                    <span className="review-question-points">{question.points || 100}pt</span>
                  </div>
                  <div className="review-question-text">
                    {question.text || '（問題文未入力）'}
                  </div>
                  <div className="review-question-answers">
                    {question.answers?.map((answer, answerIndex) => (
                      <div 
                        key={answer.id} 
                        className={`review-answer-item ${answer.isCorrect ? 'review-correct' : ''}`}
                      >
                        <span className="review-answer-label">
                          {String.fromCharCode(65 + answerIndex)}
                        </span>
                        <span className="review-answer-text">
                          {answer.text || '（選択肢未入力）'}
                        </span>
                        {answer.isCorrect && <span className="review-correct-mark">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Quiz Statistics */}
        <div className="review-main-section">
          <h3 className="review-section-header">
            <span className="review-section-icon">📊</span>
            クイズ統計
          </h3>
          
          <div className="review-stats-grid">
            <div className="review-stat-item">
              <span className="review-stat-label">総問題数</span>
              <span className="review-stat-value">{quizStats.totalQuestions}問</span>
            </div>
            <div className="review-stat-item">
              <span className="review-stat-label">推定所要時間</span>
              <span className="review-stat-value">{formatDuration(quizStats.totalDuration)}</span>
            </div>
            <div className="review-stat-item">
              <span className="review-stat-label">平均時間/問題</span>
              <span className="review-stat-value">{quizStats.averageTimePerQuestion}秒</span>
            </div>
            <div className="review-stat-item">
              <span className="review-stat-label">総獲得可能ポイント</span>
              <span className="review-stat-value">{quizStats.totalPoints.toLocaleString()}pt</span>
            </div>
          </div>

          <div className="review-stats-charts">
            <div className="review-chart-item">
              <h4>難易度分布</h4>
              <div className="review-difficulty-chart">
                {Object.entries(quizStats.difficultyDistribution).map(([difficulty, count]) => (
                  <div key={difficulty} className="review-chart-bar">
                    <span className="review-bar-label">
                      {difficulty === 'easy' ? '易' : 
                       difficulty === 'medium' ? '中' : '難'}
                    </span>
                    <div className="review-bar-container">
                      <div 
                        className="review-bar-fill"
                        style={{ 
                          width: `${(count / quizStats.totalQuestions) * 100}%`,
                          backgroundColor: getDifficultyColor(difficulty)
                        }}
                      />
                    </div>
                    <span className="review-bar-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-chart-item">
              <h4>問題タイプ</h4>
              <div className="review-type-chart">
                <div className="review-type-item">
                  <span className="review-type-label">選択問題</span>
                  <span className="review-type-value">{quizStats.questionTypes.multipleChoice}問</span>
                </div>
                <div className="review-type-item">
                  <span className="review-type-label">○×問題</span>
                  <span className="review-type-value">{quizStats.questionTypes.trueFalse}問</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Metadata Review */}
        <div className="review-main-section">
          <h3 className="review-section-header">
            <span className="review-section-icon">📋</span>
            基本情報
          </h3>
          
          <div className="review-metadata-list">
            <div className="review-metadata-item">
              <span className="review-metadata-label">タイトル</span>
              <span className="review-metadata-value">{metadata.title || '（未設定）'}</span>
            </div>
            <div className="review-metadata-item">
              <span className="review-metadata-label">説明</span>
              <span className="review-metadata-value">
                {metadata.description || '（説明なし）'}
              </span>
            </div>
            <div className="review-metadata-item">
              <span className="review-metadata-label">カテゴリー</span>
              <span className="review-metadata-value">{metadata.category || '（未選択）'}</span>
            </div>
            <div className="review-metadata-item">
              <span className="review-metadata-label">難易度レベル</span>
              <span className="review-metadata-value">{metadata.difficulty_level || '（未選択）'}</span>
            </div>
            <div className="review-metadata-item">
              <span className="review-metadata-label">タグ</span>
              <span className="review-metadata-value">
                {metadata.tags?.length > 0 ? metadata.tags.join(', ') : '（タグなし）'}
              </span>
            </div>
            <div className="review-metadata-item">
              <span className="review-metadata-label">公開設定</span>
              <span className="review-metadata-value">
                {metadata.is_public ? '公開' : 'プライベート'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Settings Review */}
        <div className="review-main-section" key={JSON.stringify(settings)}>
          <h3 className="review-section-header">
            <span className="review-section-icon">⚙️</span>
            ゲーム設定
          </h3>
          
          <div className="review-settings-container">
            <div className="review-settings-group">
              <h4>ゲーム進行</h4>
              <div className="review-settings-grid">
                <div className="review-setting-item">
                  <span className="review-setting-label">自動進行</span>
                  <span className="review-setting-value">{getBooleanSetting('game_settings.autoAdvance', 'autoAdvance')}</span>
                </div>
                <div className="review-setting-item">
                  <span className="review-setting-label">ハイブリッドモード</span>
                  <span className="review-setting-value">{getBooleanSetting('game_settings.hybridMode', 'hybridMode')}</span>
                </div>
              </div>
            </div>

            <div className="review-settings-group">
              <h4>回答・解説</h4>
              <div className="review-settings-grid">
                <div className="review-setting-item">
                  <span className="review-setting-label">解説表示</span>
                  <span className="review-setting-value">{getBooleanSetting('game_settings.showExplanations', 'showExplanations')}</span>
                </div>
                <div className="review-setting-item">
                  <span className="review-setting-label">解説表示時間</span>
                  <span className="review-setting-value">{getNumberSetting('game_settings.explanationTime', 30)}秒</span>
                </div>
              </div>
            </div>

            <div className="review-settings-group">
              <h4>スコア・ポイント</h4>
              <div className="review-settings-grid">
                <div className="review-setting-item">
                  <span className="review-setting-label">ポイント計算</span>
                  <span className="review-setting-value">
                    {getStringSetting('game_settings.pointCalculation', 'fixed') === 'time-bonus' ? '時間ボーナス' : '固定ポイント'}
                  </span>
                </div>
                <div className="review-setting-item">
                  <span className="review-setting-label">連続正解ボーナス</span>
                  <span className="review-setting-value">{getBooleanSetting('game_settings.streakBonus', 'streakBonus')}</span>
                </div>
              </div>
            </div>

            <div className="review-settings-group">
              <h4>プレイヤー体験</h4>
              <div className="review-settings-grid">
                <div className="review-setting-item">
                  <span className="review-setting-label">リーダーボード</span>
                  <span className="review-setting-value">{getBooleanSetting('game_settings.showLeaderboard', 'showLeaderboard') === 'あり' ? '表示' : '非表示'}</span>
                </div>
                <div className="review-setting-item">
                  <span className="review-setting-label">進捗表示</span>
                  <span className="review-setting-value">{getBooleanSetting('game_settings.showProgress', 'showProgress') === 'あり' ? '表示' : '非表示'}</span>
                </div>
                <div className="review-setting-item">
                  <span className="review-setting-label">最大プレイヤー数</span>
                  <span className="review-setting-value">{getNumberSetting('players_cap', 50)}人</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Action */}
      <div className="review-publish-action">
        <button
          className="review-publish-button"
          onClick={handlePublish}
          disabled={isPublishing || validationErrors.length > 0}
        >
          {isPublishing ? '公開中...' : 'クイズを公開する'}
        </button>
        
        {validationErrors.length > 0 && (
          <p className="review-publish-error">
            エラーを修正してから公開してください
          </p>
        )}
      </div>
    </div>
  );
}

export default ReviewForm;
