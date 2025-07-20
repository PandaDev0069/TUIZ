import React from 'react';
import './settingsForm.css';

function SettingsForm({ settings, setSettings, questions, onPreviewQuiz, onReorderQuestions }) {
  
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-form">
      <div className="form-header">
        <h2 className="form-title">⚙️ クイズ設定</h2>
        <p className="form-description">
          クイズの動作を詳細にカスタマイズできます。プレイヤーの体験を最適化しましょう。
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
          
          {/* Timing & Flow Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">⏱️ タイミング・フロー</h3>
              <p className="section-description">問題の表示時間と進行方法を設定</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  デフォルト制限時間
                  <span className="setting-hint">個別設定がない問題に適用</span>
                </label>
                <div className="setting-input">
                  <input
                    type="range"
                    min="5"
                    max="300"
                    value={settings.timeLimit}
                    onChange={(e) => updateSetting('timeLimit', parseInt(e.target.value))}
                    className="slider"
                  />
                  <span className="value-display">{settings.timeLimit}秒</span>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  問題間の休憩時間
                  <span className="setting-hint">回答表示後の待機時間</span>
                </label>
                <div className="setting-input">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={settings.breakDuration}
                    onChange={(e) => updateSetting('breakDuration', parseInt(e.target.value))}
                    className="slider"
                  />
                  <span className="value-display">{settings.breakDuration}秒</span>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  自動進行
                  <span className="setting-hint">時間切れ時に自動で次の問題へ</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoAdvance}
                      onChange={(e) => updateSetting('autoAdvance', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Question & Answer Ordering Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">🔀 問題・回答の順序</h3>
              <p className="section-description">問題と選択肢の表示順序を制御</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  問題の順序
                  <span className="setting-hint">プレイヤーに表示される問題の順番</span>
                </label>
                <div className="setting-input">
                  <select
                    value={settings.questionOrder}
                    onChange={(e) => updateSetting('questionOrder', e.target.value)}
                    className="setting-select"
                  >
                    <option value="original">作成順</option>
                    <option value="random-all">全員同じランダム順</option>
                    <option value="random-per-player">プレイヤー毎にランダム</option>
                    <option value="custom">カスタム順序</option>
                  </select>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  回答選択肢の順序
                  <span className="setting-hint">各問題の選択肢の表示順</span>
                </label>
                <div className="setting-input">
                  <select
                    value={settings.answerOrder}
                    onChange={(e) => updateSetting('answerOrder', e.target.value)}
                    className="setting-select"
                  >
                    <option value="original">作成順</option>
                    <option value="randomize">ランダム</option>
                    <option value="lock-first">最初の選択肢固定</option>
                    <option value="lock-last">最後の選択肢固定</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Gameplay Behavior Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">🎮 ゲームプレイ</h3>
              <p className="section-description">プレイヤーの操作と情報表示を設定</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  正解を表示
                  <span className="setting-hint">回答後に正解を表示する</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showCorrectAnswer}
                      onChange={(e) => updateSetting('showCorrectAnswer', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  解説を表示
                  <span className="setting-hint">正解時に解説文を表示</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showExplanations}
                      onChange={(e) => updateSetting('showExplanations', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  回答変更を許可
                  <span className="setting-hint">制限時間内での回答変更</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.allowAnswerChange}
                      onChange={(e) => updateSetting('allowAnswerChange', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  遅延回答を許可
                  <span className="setting-hint">時間切れ後も回答受付</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.allowLateSubmissions}
                      onChange={(e) => updateSetting('allowLateSubmissions', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Scoring & Points Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">🏆 スコア・ポイント</h3>
              <p className="section-description">ポイント計算とボーナス設定</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  ポイント計算方法
                  <span className="setting-hint">回答速度によるボーナス</span>
                </label>
                <div className="setting-input">
                  <select
                    value={settings.pointCalculation}
                    onChange={(e) => updateSetting('pointCalculation', e.target.value)}
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
                  <span className="setting-hint">連続で正解した場合のボーナス</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.streakBonus}
                      onChange={(e) => updateSetting('streakBonus', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  不正解ペナルティ
                  <span className="setting-hint">間違いでポイント減点</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.wrongAnswerPenalty}
                      onChange={(e) => updateSetting('wrongAnswerPenalty', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Player Experience Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">👥 プレイヤー体験</h3>
              <p className="section-description">参加者向けの表示とオプション</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  リーダーボード表示
                  <span className="setting-hint">問題間でランキング表示</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showLeaderboard}
                      onChange={(e) => updateSetting('showLeaderboard', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  進捗表示
                  <span className="setting-hint">現在の問題数を表示</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showProgress}
                      onChange={(e) => updateSetting('showProgress', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  リプレイ許可
                  <span className="setting-hint">終了後の再挑戦を許可</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.allowReplay}
                      onChange={(e) => updateSetting('allowReplay', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  観戦モード
                  <span className="setting-hint">途中参加者は観戦のみ</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.spectatorMode}
                      onChange={(e) => updateSetting('spectatorMode', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Advanced Options Section */}
          <div className="settings-section">
            <div className="section-header">
              <h3 className="section-title">🎯 高度な設定</h3>
              <p className="section-description">ルーム管理と参加制限</p>
            </div>
            <div className="settings-grid">
              
              <div className="setting-item">
                <label className="setting-label">
                  最大参加人数
                  <span className="setting-hint">同時に参加できる人数</span>
                </label>
                <div className="setting-input">
                  <input
                    type="range"
                    min="2"
                    max="300"
                    value={settings.maxPlayers}
                    onChange={(e) => updateSetting('maxPlayers', parseInt(e.target.value))}
                    className="slider"
                  />
                  <span className="value-display">{settings.maxPlayers}人</span>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  自動開始
                  <span className="setting-hint">人数が揃ったら自動でスタート</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoStart}
                      onChange={(e) => updateSetting('autoStart', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  非アクティブ者を除外
                  <span className="setting-hint">一定時間無応答で退室</span>
                </label>
                <div className="setting-input">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.kickInactive}
                      onChange={(e) => updateSetting('kickInactive', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {settings.kickInactive && (
                <div className="setting-item">
                  <label className="setting-label">
                    非アクティブ判定時間
                    <span className="setting-hint">この時間無応答で除外</span>
                  </label>
                  <div className="setting-input">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={settings.inactiveTimeout}
                      onChange={(e) => updateSetting('inactiveTimeout', parseInt(e.target.value))}
                      className="slider"
                    />
                    <span className="value-display">{settings.inactiveTimeout}秒</span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Settings Summary */}
        <div className="settings-summary">
          <h3 className="summary-title">設定サマリー</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">問題数</span>
              <span className="stat-value">{questions.length}問</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">予想時間</span>
              <span className="stat-value">
                {Math.ceil((questions.reduce((total, q) => total + q.timeLimit, 0) + 
                           (questions.length * settings.breakDuration)) / 60)}分
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最大参加者</span>
              <span className="stat-value">{settings.maxPlayers}人</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">問題順序</span>
              <span className="stat-value">
                {settings.questionOrder === 'original' ? '作成順' :
                 settings.questionOrder === 'random-all' ? 'ランダム' :
                 settings.questionOrder === 'random-per-player' ? '個別ランダム' : 'カスタム'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SettingsForm;
