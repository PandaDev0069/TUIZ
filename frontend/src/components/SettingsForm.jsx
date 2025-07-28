import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import './settingsForm.css';

function SettingsForm({ settings, setSettings, questions, onPreviewQuiz, onReorderQuestions, questionSetId }) {
  const { apiCall } = useAuth();
  const [isSyncing, setIsSyncing] = React.useState(false);
  
  // Load settings from backend when component mounts or questionSetId changes
  useEffect(() => {
    const loadSettingsFromBackend = async () => {
      if (!questionSetId) return;

      // If settings already have game_settings (loaded from draft), don't override them
      if (settings && settings.game_settings && Object.keys(settings.game_settings).length > 0) {
        return;
      }

      try {
        const response = await apiCall(`/quiz/${questionSetId}`, {
          method: 'GET'
        });

        if (response.success && response.data) {
          const quizData = response.data;
          
          // Replace settings with only database fields (don't merge with frontend fields)
          const loadedSettings = {
            // Player capacity from play_settings JSON (not a direct column)
            players_cap: quizData.play_settings?.players_cap || 50,
            
            // Settings from play_settings JSON field - only store what's in the database
            game_settings: {
              // Game Flow
              autoAdvance: quizData.play_settings?.autoAdvance || false,
              hybridMode: quizData.play_settings?.hybridMode || false,
              
              // Answer & Explanation
              showExplanations: quizData.play_settings?.showExplanations || false,
              explanationTime: quizData.play_settings?.explanationTime || 30,
              
              // Scoring & Points
              pointCalculation: quizData.play_settings?.pointCalculation || 'fixed',
              streakBonus: quizData.play_settings?.streakBonus || false,
              
              // Player Experience
              showLeaderboard: quizData.play_settings?.showLeaderboard || false,
              showProgress: quizData.play_settings?.showProgress || false,
            }
          };

          // Set settings to only contain database fields (don't merge with frontend-only fields)
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error('❌ Failed to load settings:', error);
        // Use default settings if loading fails
      }
    };

    loadSettingsFromBackend();
  }, [questionSetId, apiCall, setSettings, settings]);

  const syncSettingsToBackend = async (updatedSettings) => {
    if (!questionSetId) return;

    try {
      setIsSyncing(true);
      
      // Prepare data for question_sets table (direct fields)
      const directFields = {
        // No direct fields for game settings - they all go in play_settings JSON
        // players_cap belongs to games table, not question_sets
      };

      // Prepare data for play_settings JSON field
      const playSettings = {
        // Game Flow
        autoAdvance: updatedSettings.game_settings?.autoAdvance || false,
        hybridMode: updatedSettings.game_settings?.hybridMode || false,
        
        // Answer & Explanation
        showExplanations: updatedSettings.game_settings?.showExplanations || false,
        explanationTime: updatedSettings.game_settings?.explanationTime || 30,
        
        // Scoring & Points
        pointCalculation: updatedSettings.game_settings?.pointCalculation || 'fixed',
        streakBonus: updatedSettings.game_settings?.streakBonus || false,
        
        // Player Experience
        showLeaderboard: updatedSettings.game_settings?.showLeaderboard || false,
        showProgress: updatedSettings.game_settings?.showProgress || false,
        
        // Player Capacity (stored in JSON since it's not a direct column)
        players_cap: updatedSettings.players_cap || 50,
      };

      // Update the question set with play_settings only
      const updateData = {
        play_settings: playSettings
      };

      await apiCall(`/quiz/${questionSetId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      // Optionally show success message for important settings
      // showSuccess('設定が保存されました');
    } catch (error) {
      console.error('❌ Failed to sync settings:', error);
      showError('設定の保存に失敗しました');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    
    setSettings(newSettings);
    
    // Sync to backend with debouncing
    clearTimeout(updateSetting.timeoutId);
    updateSetting.timeoutId = setTimeout(() => {
      syncSettingsToBackend(newSettings);
    }, 1000); // 1 second debounce
  };

  // Update game_settings for non-database fields
  const updateGameSetting = async (key, value) => {
    const newSettings = {
      ...settings,
      game_settings: {
        ...settings.game_settings,
        [key]: value
      }
    };
    
    setSettings(newSettings);
    
    // Sync to backend with debouncing
    clearTimeout(updateGameSetting.timeoutId);
    updateGameSetting.timeoutId = setTimeout(() => {
      syncSettingsToBackend(newSettings);
    }, 1000); // 1 second debounce
  };

  return (
    <div className="settings-form">
      <div className="form-header">
        <h2 className="form-title">⚙️ クイズ設定</h2>
        <p className="form-description">
          クイズの流れとプレイヤー体験を設定します
        </p>
      </div>

      <div className="form-content">
        {/* Quick Actions */}
        <div className="quick-actions">
          <button 
            className="action-button preview"
            onClick={onPreviewQuiz}
            title="クイズの流れを確認"
          >
            👁️ プレビュー
          </button>
          <button 
            className="action-button reorder"
            onClick={onReorderQuestions}
            title="問題の順序を変更"
          >
            🔀 順序変更
          </button>
        </div>

        {/* Settings Sections */}
        <div className="settings-sections">
          
          {/* 1. Game Flow Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">1️⃣ ゲームフロー</h3>
              <p className="section-description">問題の進行とタイミングを制御</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  自動進行
                  <span className="setting-hint">制限時間が終了したら自動で次の問題へ移動</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.game_settings?.autoAdvance || false}
                      onChange={(e) => updateGameSetting('autoAdvance', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  ハイブリッドモード
                  <span className="setting-hint">問題は自動進行するが、解説とスコアボードはホストが手動で進める</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.game_settings?.hybridMode || false}
                      onChange={(e) => updateGameSetting('hybridMode', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* 2. Answer & Explanation Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">2️⃣ 回答・解説</h3>
              <p className="section-description">回答表示と解説の設定</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  正解と解説を表示
                  <span className="setting-hint">各問題の後に正解と解説を表示する</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.game_settings?.showExplanations || false}
                      onChange={(e) => updateGameSetting('showExplanations', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {settings.game_settings?.showExplanations && (
                <div className="setting-item">
                  <label className="setting-label">
                    表示時間
                    <span className="setting-hint">解説を表示する時間（20秒〜60秒）</span>
                  </label>
                  <div className="setting-input">
                    <input
                      type="range"
                      min="20"
                      max="60"
                      value={settings.game_settings?.explanationTime || 30}
                      onChange={(e) => updateGameSetting('explanationTime', parseInt(e.target.value))}
                      className="slider"
                    />
                    <span className="value-display">{settings.game_settings?.explanationTime || 30}秒</span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 3. Scoring & Points Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">3️⃣ スコア・ポイント</h3>
              <p className="section-description">ポイント計算とボーナスの設定</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  ポイント計算方法
                  <span className="setting-hint">正解時のポイント計算方法</span>
                </label>
                <div className="setting-input">
                  <select
                    value={settings.game_settings?.pointCalculation || 'fixed'}
                    onChange={(e) => updateGameSetting('pointCalculation', e.target.value)}
                    className="setting-select"
                  >
                    <option value="fixed">固定ポイント</option>
                    <option value="time-bonus">時間ボーナス付き</option>
                  </select>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  連続正解ボーナス
                  <span className="setting-hint">連続で正解した場合に追加ポイントを与える</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.game_settings?.streakBonus || false}
                      onChange={(e) => updateGameSetting('streakBonus', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* 4. Player Experience Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">4️⃣ プレイヤー体験</h3>
              <p className="section-description">プレイヤーインターフェースとフィードバックの設定</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  リーダーボード表示
                  <span className="setting-hint">各問題の後に解説と一緒にリーダーボードを表示</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.game_settings?.showLeaderboard || false}
                      onChange={(e) => updateGameSetting('showLeaderboard', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  進捗表示
                  <span className="setting-hint">現在の問題数を表示（例：「問題 X / Y」）</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.game_settings?.showProgress || false}
                      onChange={(e) => updateGameSetting('showProgress', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  最大参加人数
                  <span className="setting-hint">最大参加可能人数（2〜300人）</span>
                </label>
                <div className="setting-input">
                  <input
                    type="range"
                    min="2"
                    max="300"
                    value={settings.players_cap || 50}
                    onChange={(e) => updateSetting('players_cap', parseInt(e.target.value))}
                    className="slider"
                  />
                  <span className="value-display">{settings.players_cap || 50}人</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Summary Section */}
        <div className="settings-summary">
          <div className="summary-header">
            <h3 className="summary-title">📊 サマリー</h3>
            {isSyncing && (
              <div className="sync-indicator">
                <span className="sync-spinner">🔄</span>
                <span className="sync-text">設定を保存中...</span>
              </div>
            )}
          </div>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">問題数</span>
              <span className="stat-value">{questions.length}問</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">予想総時間</span>
              <span className="stat-value">
                {Math.ceil((questions.reduce((total, q) => total + (q.time_limit || 30), 0) + 
                           (questions.length * (settings.game_settings?.explanationTime || 0))) / 60)}分
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最大参加者</span>
              <span className="stat-value">{settings.players_cap || 50}人</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SettingsForm;
