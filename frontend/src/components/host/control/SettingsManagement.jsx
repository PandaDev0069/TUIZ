import { useState, useEffect } from 'react';
import { 
  FaCog,
  FaUsers,
  FaClock,
  FaVolumeUp,
  FaEye,
  FaBolt,
  FaShield,
  FaChartBar,
  FaSave,
  FaUndo,
  FaDownload,
  FaUpload,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCopy
} from 'react-icons/fa';
import socket from '../../../socket';
import './SettingsManagement.css';

/**
 * SettingsManagement - Advanced Settings Management Interface
 * Phase 2.2: Game Control Panel
 * 
 * Features:
 * - Game settings configuration
 * - Player management settings
 * - Timing and scoring settings
 * - Audio/visual preferences
 * - Security and moderation settings
 * - Settings import/export
 * - Preset management
 */
function SettingsManagement({ gameState, onSettingsChange, currentSettings = {} }) {
  // Settings categories
  const [activeCategory, setActiveCategory] = useState('game');
  const [settings, setSettings] = useState({
    game: {
      autoAdvance: true,
      showCorrectAnswers: true,
      allowSkipping: false,
      randomizeQuestions: false,
      randomizeAnswers: true,
      showProgress: true,
      enableHints: false,
      maxAttempts: 1
    },
    timing: {
      defaultQuestionTime: 30,
      showTimer: true,
      warningTime: 10,
      autoSubmit: true,
      allowExtraTime: false,
      pauseBetweenQuestions: 3,
      showCountdown: true,
      timerSound: true
    },
    players: {
      maxPlayers: 100,
      allowLateJoin: true,
      requireNames: true,
      allowAnonymous: false,
      kickInactive: false,
      inactiveTimeout: 300,
      allowSpectators: true,
      autoApprove: true
    },
    scoring: {
      pointsCorrect: 100,
      pointsPartial: 50,
      pointsIncorrect: 0,
      timeBonus: true,
      streakBonus: true,
      difficultyMultiplier: true,
      showRealTimeScores: true,
      showLeaderboard: true
    },
    audiovisual: {
      enableSound: true,
      volume: 70,
      correctSound: 'chime',
      incorrectSound: 'buzz',
      enableAnimations: true,
      transitionSpeed: 'normal',
      showParticles: true,
      darkMode: false
    },
    security: {
      enableModeration: true,
      filterProfanity: true,
      allowChat: false,
      logActivity: true,
      requireAuth: false,
      ipRestriction: false,
      rateLimiting: true,
      autoReport: false
    }
  });

  // UI state
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const [showPresets, setShowPresets] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Presets
  const [presets, setPresets] = useState([
    {
      id: 'competitive',
      name: '競技モード',
      description: '厳格なルールで競技性を重視',
      icon: FaBolt,
      settings: {
        game: { autoAdvance: true, showCorrectAnswers: false, allowSkipping: false },
        timing: { defaultQuestionTime: 20, autoSubmit: true, allowExtraTime: false },
        scoring: { timeBonus: true, streakBonus: true, showRealTimeScores: false }
      }
    },
    {
      id: 'educational',
      name: '教育モード',
      description: '学習に最適化された設定',
      icon: FaEye,
      settings: {
        game: { autoAdvance: false, showCorrectAnswers: true, enableHints: true },
        timing: { defaultQuestionTime: 45, allowExtraTime: true, showTimer: true },
        scoring: { pointsIncorrect: 25, showRealTimeScores: true }
      }
    },
    {
      id: 'casual',
      name: 'カジュアルモード',
      description: 'リラックスした雰囲気でのクイズ',
      icon: FaUsers,
      settings: {
        game: { allowSkipping: true, showCorrectAnswers: true, enableHints: true },
        players: { allowLateJoin: true, allowAnonymous: true },
        timing: { defaultQuestionTime: 60, allowExtraTime: true }
      }
    }
  ]);

  // Initialize settings from props
  useEffect(() => {
    if (currentSettings && Object.keys(currentSettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...currentSettings
      }));
    }
  }, [currentSettings]);

  // Socket event handlers
  useEffect(() => {
    socket.on('settingsUpdated', handleSettingsUpdated);
    socket.on('settingsSaved', handleSettingsSaved);
    socket.on('settingsError', handleSettingsError);

    return () => {
      socket.off('settingsUpdated');
      socket.off('settingsSaved');
      socket.off('settingsError');
    };
  }, []);

  const handleSettingsUpdated = (data) => {
    setSettings(data.settings);
    setHasChanges(false);
  };

  const handleSettingsSaved = () => {
    setSaveStatus('saved');
    setHasChanges(false);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSettingsError = (error) => {
    setSaveStatus('error');
    console.error('Settings error:', error);
    setTimeout(() => setSaveStatus(null), 5000);
  };

  // Settings change handler
  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    
    try {
      socket.emit('updateGameSettings', {
        gameId: gameState?.id,
        settings: settings
      });

      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save settings:', error);
    }
  };

  // Reset settings
  const handleResetSettings = () => {
    setSettings(prev => {
      const defaultSettings = { ...prev };
      // Reset to default values
      Object.keys(defaultSettings).forEach(category => {
        Object.keys(defaultSettings[category]).forEach(key => {
          // Define default values based on type
          const currentValue = defaultSettings[category][key];
          if (typeof currentValue === 'boolean') {
            defaultSettings[category][key] = false;
          } else if (typeof currentValue === 'number') {
            defaultSettings[category][key] = key.includes('Time') ? 30 : 100;
          } else {
            defaultSettings[category][key] = '';
          }
        });
      });
      return defaultSettings;
    });
    setHasChanges(true);
    setShowConfirmReset(false);
  };

  // Apply preset
  const handleApplyPreset = (preset) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      Object.keys(preset.settings).forEach(category => {
        if (newSettings[category]) {
          Object.keys(preset.settings[category]).forEach(key => {
            if (newSettings[category][key] !== undefined) {
              newSettings[category][key] = preset.settings[category][key];
            }
          });
        }
      });
      return newSettings;
    });
    setHasChanges(true);
    setShowPresets(false);
  };

  // Export settings
  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `tuiz-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import settings
  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setSettings(importedSettings);
          setHasChanges(true);
          setShowImportExport(false);
        } catch (error) {
          alert('無効な設定ファイルです。');
        }
      };
      reader.readAsText(file);
    }
  };

  // Render settings section
  const renderSettingsSection = (category) => {
    const categorySettings = settings[category];
    if (!categorySettings) return null;

    return (
      <div className="settings-section">
        {Object.entries(categorySettings).map(([key, value]) => (
          <div key={key} className="setting-item">
            <div className="setting-item__info">
              <label className="setting-item__label">
                {getSettingLabel(category, key)}
              </label>
              <div className="setting-item__description">
                {getSettingDescription(category, key)}
              </div>
            </div>
            
            <div className="setting-item__control">
              {renderSettingControl(category, key, value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render setting control based on type
  const renderSettingControl = (category, key, value) => {
    if (typeof value === 'boolean') {
      return (
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleSettingChange(category, key, e.target.checked)}
          />
          <span className="toggle-switch__slider"></span>
        </label>
      );
    } else if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleSettingChange(category, key, parseInt(e.target.value))}
          className="setting-input setting-input--number"
          min={getSettingMin(category, key)}
          max={getSettingMax(category, key)}
        />
      );
    } else {
      return (
        <select
          value={value}
          onChange={(e) => handleSettingChange(category, key, e.target.value)}
          className="setting-input setting-input--select"
        >
          {getSettingOptions(category, key).map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
  };

  // Helper functions for setting metadata
  const getSettingLabel = (category, key) => {
    const labels = {
      autoAdvance: '自動進行',
      showCorrectAnswers: '正解表示',
      allowSkipping: 'スキップ許可',
      randomizeQuestions: '問題シャッフル',
      randomizeAnswers: '選択肢シャッフル',
      showProgress: '進捗表示',
      enableHints: 'ヒント有効',
      maxAttempts: '最大試行回数',
      defaultQuestionTime: 'デフォルト制限時間',
      showTimer: 'タイマー表示',
      warningTime: '警告時間',
      autoSubmit: '自動提出',
      allowExtraTime: '延長時間許可',
      pauseBetweenQuestions: '問題間ポーズ',
      showCountdown: 'カウントダウン表示',
      timerSound: 'タイマー音',
      maxPlayers: '最大プレイヤー数',
      allowLateJoin: '途中参加許可',
      requireNames: '名前必須',
      allowAnonymous: '匿名許可',
      kickInactive: '非アクティブキック',
      inactiveTimeout: '非アクティブタイムアウト',
      allowSpectators: '観戦者許可',
      autoApprove: '自動承認',
      pointsCorrect: '正解ポイント',
      pointsPartial: '部分点',
      pointsIncorrect: '不正解ポイント',
      timeBonus: '時間ボーナス',
      streakBonus: '連続ボーナス',
      difficultyMultiplier: '難易度倍率',
      showRealTimeScores: 'リアルタイムスコア',
      showLeaderboard: 'リーダーボード表示',
      enableSound: '音声有効',
      volume: '音量',
      correctSound: '正解音',
      incorrectSound: '不正解音',
      enableAnimations: 'アニメーション有効',
      transitionSpeed: '遷移速度',
      showParticles: 'パーティクル表示',
      darkMode: 'ダークモード',
      enableModeration: 'モデレーション有効',
      filterProfanity: '不適切語句フィルター',
      allowChat: 'チャット許可',
      logActivity: 'アクティビティログ',
      requireAuth: '認証必須',
      ipRestriction: 'IP制限',
      rateLimiting: 'レート制限',
      autoReport: '自動報告'
    };
    return labels[key] || key;
  };

  const getSettingDescription = (category, key) => {
    const descriptions = {
      autoAdvance: '時間切れ時に自動的に次の問題に進む',
      showCorrectAnswers: '回答後に正解を表示する',
      allowSkipping: 'プレイヤーが問題をスキップできる',
      randomizeQuestions: '問題の順序をランダムにする',
      randomizeAnswers: '選択肢の順序をランダムにする',
      showProgress: 'クイズの進捗状況を表示する',
      enableHints: 'ヒント機能を有効にする',
      defaultQuestionTime: '各問題のデフォルト制限時間（秒）',
      showTimer: 'タイマーを表示する',
      warningTime: '警告を表示する残り時間（秒）',
      autoSubmit: '時間切れ時に自動的に回答を提出する',
      allowExtraTime: 'ホストが時間を延長できる',
      maxPlayers: '同時に参加できる最大プレイヤー数',
      allowLateJoin: 'ゲーム開始後の参加を許可する',
      requireNames: 'プレイヤー名の入力を必須にする',
      allowAnonymous: '匿名での参加を許可する',
      pointsCorrect: '正解時に獲得するポイント',
      pointsPartial: '部分正解時に獲得するポイント',
      pointsIncorrect: '不正解時のポイント（通常は0）',
      enableSound: 'ゲーム中の効果音を有効にする',
      volume: '効果音の音量（0-100）',
      enableAnimations: '画面遷移アニメーションを有効にする',
      enableModeration: 'コンテンツのモデレーション機能を有効にする',
      filterProfanity: '不適切な語句を自動フィルタリングする',
      allowChat: 'プレイヤー間のチャット機能を許可する'
    };
    return descriptions[key] || '';
  };

  const getSettingMin = (category, key) => {
    const mins = {
      defaultQuestionTime: 5,
      warningTime: 1,
      pauseBetweenQuestions: 0,
      maxPlayers: 1,
      inactiveTimeout: 60,
      maxAttempts: 1,
      pointsCorrect: 0,
      pointsPartial: 0,
      pointsIncorrect: 0,
      volume: 0
    };
    return mins[key] || 0;
  };

  const getSettingMax = (category, key) => {
    const maxs = {
      defaultQuestionTime: 300,
      warningTime: 60,
      pauseBetweenQuestions: 30,
      maxPlayers: 1000,
      inactiveTimeout: 3600,
      maxAttempts: 10,
      pointsCorrect: 1000,
      pointsPartial: 1000,
      pointsIncorrected: 1000,
      volume: 100
    };
    return maxs[key] || 100;
  };

  const getSettingOptions = (category, key) => {
    const options = {
      correctSound: [
        { value: 'chime', label: 'チャイム' },
        { value: 'ding', label: 'ディン' },
        { value: 'bell', label: 'ベル' },
        { value: 'none', label: 'なし' }
      ],
      incorrectSound: [
        { value: 'buzz', label: 'ブザー' },
        { value: 'beep', label: 'ビープ' },
        { value: 'none', label: 'なし' }
      ],
      transitionSpeed: [
        { value: 'slow', label: '遅い' },
        { value: 'normal', label: '普通' },
        { value: 'fast', label: '速い' }
      ]
    };
    return options[key] || [];
  };

  const categories = [
    { id: 'game', label: 'ゲーム', icon: FaCog },
    { id: 'timing', label: 'タイミング', icon: FaClock },
    { id: 'players', label: 'プレイヤー', icon: FaUsers },
    { id: 'scoring', label: 'スコア', icon: FaChartBar },
    { id: 'audiovisual', label: 'オーディオ・ビジュアル', icon: FaVolumeUp },
    { id: 'security', label: 'セキュリティ', icon: FaShield }
  ];

  return (
    <div className="settings-management">
      {/* Header */}
      <div className="settings-management__header">
        <div className="settings-header__title">
          <FaCog className="settings-header__icon" />
          <h2>ゲーム設定</h2>
        </div>

        <div className="settings-header__actions">
          <button
            className="settings-btn settings-btn--secondary"
            onClick={() => setShowPresets(true)}
          >
            <FaCopy />
            プリセット
          </button>

          <button
            className="settings-btn settings-btn--secondary"
            onClick={() => setShowImportExport(true)}
          >
            <FaDownload />
            インポート/エクスポート
          </button>

          <button
            className="settings-btn settings-btn--outline"
            onClick={() => setShowConfirmReset(true)}
          >
            <FaUndo />
            リセット
          </button>

          <button
            className={`settings-btn settings-btn--primary ${hasChanges ? 'settings-btn--highlighted' : ''}`}
            onClick={handleSaveSettings}
            disabled={!hasChanges || saveStatus === 'saving'}
          >
            <FaSave />
            {saveStatus === 'saving' ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div className={`save-status save-status--${saveStatus}`}>
          {saveStatus === 'saving' && <FaCog className="save-status__icon spinning" />}
          {saveStatus === 'saved' && <FaCheckCircle className="save-status__icon" />}
          {saveStatus === 'error' && <FaExclamationTriangle className="save-status__icon" />}
          <span className="save-status__text">
            {saveStatus === 'saving' && '設定を保存しています...'}
            {saveStatus === 'saved' && '設定が保存されました'}
            {saveStatus === 'error' && '保存中にエラーが発生しました'}
          </span>
        </div>
      )}

      <div className="settings-management__content">
        {/* Category Navigation */}
        <div className="settings-nav">
          {categories.map(category => (
            <button
              key={category.id}
              className={`settings-nav__item ${
                activeCategory === category.id ? 'settings-nav__item--active' : ''
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              <category.icon className="settings-nav__icon" />
              <span className="settings-nav__label">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          <div className="settings-content__header">
            <h3>{categories.find(c => c.id === activeCategory)?.label}</h3>
            <div className="settings-content__description">
              {activeCategory === 'game' && 'ゲームの基本的な動作を設定します'}
              {activeCategory === 'timing' && 'タイマーと時間関連の設定を行います'}
              {activeCategory === 'players' && 'プレイヤーの参加と管理に関する設定です'}
              {activeCategory === 'scoring' && 'スコア計算とポイントシステムの設定です'}
              {activeCategory === 'audiovisual' && 'オーディオとビジュアルエフェクトの設定です'}
              {activeCategory === 'security' && 'セキュリティとモデレーションの設定です'}
            </div>
          </div>

          {renderSettingsSection(activeCategory)}
        </div>
      </div>

      {/* Presets Modal */}
      {showPresets && (
        <div className="settings-modal-overlay" onClick={() => setShowPresets(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3>設定プリセット</h3>
              <button
                className="settings-modal__close"
                onClick={() => setShowPresets(false)}
              >
                ×
              </button>
            </div>

            <div className="settings-modal__content">
              <div className="presets-grid">
                {presets.map(preset => (
                  <div key={preset.id} className="preset-card">
                    <div className="preset-card__header">
                      <preset.icon className="preset-card__icon" />
                      <h4 className="preset-card__title">{preset.name}</h4>
                    </div>
                    <p className="preset-card__description">{preset.description}</p>
                    <button
                      className="settings-btn settings-btn--primary settings-btn--small"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      適用
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <div className="settings-modal-overlay" onClick={() => setShowImportExport(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3>設定のインポート/エクスポート</h3>
              <button
                className="settings-modal__close"
                onClick={() => setShowImportExport(false)}
              >
                ×
              </button>
            </div>

            <div className="settings-modal__content">
              <div className="import-export-actions">
                <div className="action-card">
                  <FaDownload className="action-card__icon" />
                  <h4>設定をエクスポート</h4>
                  <p>現在の設定をJSONファイルとして保存します</p>
                  <button
                    className="settings-btn settings-btn--secondary"
                    onClick={handleExportSettings}
                  >
                    エクスポート
                  </button>
                </div>

                <div className="action-card">
                  <FaUpload className="action-card__icon" />
                  <h4>設定をインポート</h4>
                  <p>以前にエクスポートした設定ファイルを読み込みます</p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportSettings}
                    style={{ display: 'none' }}
                    id="import-settings"
                  />
                  <label htmlFor="import-settings" className="settings-btn settings-btn--secondary">
                    ファイル選択
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showConfirmReset && (
        <div className="settings-modal-overlay">
          <div className="settings-modal settings-modal--small">
            <div className="settings-modal__header">
              <FaExclamationTriangle className="settings-modal__warning-icon" />
              <h3>設定のリセット</h3>
            </div>

            <div className="settings-modal__content">
              <p>すべての設定をデフォルト値にリセットしますか？この操作は元に戻せません。</p>
              
              <div className="settings-modal__actions">
                <button
                  className="settings-btn settings-btn--outline"
                  onClick={() => setShowConfirmReset(false)}
                >
                  キャンセル
                </button>
                <button
                  className="settings-btn settings-btn--danger"
                  onClick={handleResetSettings}
                >
                  リセット実行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsManagement;
