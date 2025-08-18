import React, { useState, useEffect } from 'react';
import { 
  FiSettings, 
  FiX, 
  FiRotateCcw, 
  FiSave, 
  FiEye, 
  FiSliders,
  FiTarget,
  FiAward,
  FiUsers,
  FiClock
} from 'react-icons/fi';
import { useGameSettings } from '../../../hooks/useGameSettings';
import { showSuccess, showError } from '../../../utils/toast';
import LoadingSkeleton from '../../LoadingSkeleton';
import { useTimerManager } from '../../../utils/timerManager';
import './gameSettingsPanel.css';

/**
 * Host Game Settings Panel Component
 * 
 * Modern settings panel for host control following TUIZ design system.
 * Features:
 * - BEM naming convention
 * - Universal theme integration
 * - Accessibility support
 * - Real-time validation
 * - Auto-save functionality
 * 
 * @param {Object} props
 * @param {string} props.questionSetId - ID of the question set
 * @param {string} props.gameId - ID of the game
 * @param {Function} props.onClose - Close callback function
 */

const settingsConfig = {
  gameFlow: {
    title: "ゲームフロー",
    icon: <FiClock className="settings-category__icon" />,
    description: "ゲームの進行とタイミングを設定",
    settings: [
      {
        key: "flowMode",
        label: "進行モード",
        type: "select",
        options: [
          { value: "manual", label: "手動進行 - ホストがすべてを制御" },
          { value: "auto", label: "自動進行 - 全てタイマーで自動" },
          { value: "hybrid", label: "ハイブリッド - 問題は自動、説明は手動" }
        ],
        description: "ゲームの進行方法を選択",
        defaultValue: "auto"
      },
      {
        key: "explanationTime",
        label: "解説表示時間",
        type: "slider",
        min: 20,
        max: 120,
        step: 5,
        unit: "秒",
        description: "自動進行時の解説表示時間",
        defaultValue: 30
      }
    ]
  },
  scoring: {
    title: "スコア・ポイント", 
    icon: <FiAward className="settings-category__icon" />,
    description: "得点システムとボーナス設定",
    settings: [
      {
        key: "pointCalculation",
        label: "ポイント計算",
        type: "select",
        options: [
          { value: "fixed", label: "固定ポイント" },
          { value: "time-bonus", label: "時間ボーナス付き" }
        ],
        description: "正解時のポイント計算方法",
        defaultValue: "fixed"
      },
      {
        key: "streakBonus",
        label: "連続正解ボーナス",
        type: "toggle",
        description: "連続で正解した場合にボーナスポイント",
        defaultValue: false
      }
    ]
  },
  display: {
    title: "表示オプション",
    icon: <FiEye className="settings-category__icon" />,
    description: "プレイヤー画面の表示設定",
    settings: [
      {
        key: "showProgress",
        label: "進捗表示",
        type: "toggle", 
        description: "現在の問題数を表示（例：「問題 X / Y」）",
        defaultValue: true
      },
      {
        key: "showLeaderboard",
        label: "リーダーボード",
        type: "toggle",
        description: "各問題後にリーダーボードを表示",
        defaultValue: true
      }
    ]
  },
  basic: {
    title: "基本設定",
    icon: <FiUsers className="settings-category__icon" />,
    description: "基本的なゲーム設定",
    settings: [
      {
        key: "maxPlayers",
        label: "最大参加者数",
        type: "slider",
        min: 2,
        max: 300,
        step: 1,
        unit: "人",
        defaultValue: 50
      }
    ]
  }
};

/**
 * Individual Setting Control Component
 */
const SettingControl = ({ setting, value, onChange, disabled }) => {
  const handleChange = (newValue) => {
    onChange(setting.key, newValue);
  };

  const renderControl = () => {
    switch (setting.type) {
      case 'toggle':
        return (
          <label className="settings-control settings-control--toggle">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={disabled}
              className="settings-control__input"
              aria-describedby={setting.description ? `${setting.key}-desc` : undefined}
            />
            <span className="settings-control__slider" aria-hidden="true">
              <span className="settings-control__slider-thumb"></span>
            </span>
            <span className="sr-only">
              {setting.label}: {value ? 'オン' : 'オフ'}
            </span>
          </label>
        );

      case 'slider':
        return (
          <div className="settings-control settings-control--slider">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={value || setting.defaultValue || setting.min}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              disabled={disabled}
              className="settings-control__range"
              aria-label={`${setting.label}: ${value || setting.defaultValue || setting.min}${setting.unit}`}
            />
            <span className="settings-control__value" aria-live="polite">
              {value || setting.defaultValue || setting.min}{setting.unit}
            </span>
          </div>
        );

      case 'select':
        return (
          <select
            value={value || setting.defaultValue || setting.options[0].value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className="settings-control settings-control--select"
            aria-describedby={setting.description ? `${setting.key}-desc` : undefined}
          >
            {setting.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-item__control">
      {renderControl()}
    </div>
  );
};

/**
 * Settings Category Component
 */
const SettingsCategory = ({ category, settings, onChange, disabled }) => {
  return (
    <div className="settings-category">
      <div className="settings-category__header">
        {category.icon}
        <div className="settings-category__text">
          <h4 className="settings-category__title">{category.title}</h4>
          <p className="settings-category__description">{category.description}</p>
        </div>
      </div>
      
      <div className="settings-category__content">
        {category.settings.map(setting => {
          // Check if setting should be shown based on dependencies
          if (setting.dependsOn && !settings[setting.dependsOn]) {
            return null;
          }

          return (
            <div key={setting.key} className="settings-item">
              <div className="settings-item__info">
                <label className="settings-item__label" htmlFor={setting.key}>
                  {setting.label}
                </label>
                {setting.description && (
                  <p className="settings-item__description" id={`${setting.key}-desc`}>
                    {setting.description}
                  </p>
                )}
              </div>
              <SettingControl
                setting={setting}
                value={settings[setting.key]}
                onChange={onChange}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Main Game Settings Panel Component
 */
const GameSettingsPanel = ({ questionSetId, gameId, onClose }) => {
  const { settings, loading, saving, error, updateSettings, resetToDefaults } = useGameSettings(questionSetId, gameId);
  const [localSettings, setLocalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const timerManager = useTimerManager();

  // Convert backend settings to UI flowMode
  const getFlowModeFromSettings = (settings) => {
    if (!settings.autoAdvance && !settings.hybridMode) return 'manual';
    if (settings.autoAdvance && settings.hybridMode) return 'hybrid';
    if (settings.autoAdvance && !settings.hybridMode) return 'auto';
    return 'auto'; // default
  };

  // Convert UI flowMode to backend settings
  const getSettingsFromFlowMode = (flowMode) => {
    switch (flowMode) {
      case 'manual':
        return { autoAdvance: false, hybridMode: false };
      case 'hybrid':
        return { autoAdvance: true, hybridMode: true };
      case 'auto':
      default:
        return { autoAdvance: true, hybridMode: false };
    }
  };

  useEffect(() => {
    if (settings) {
      // Convert backend settings to UI settings with flowMode
      const uiSettings = {
        ...settings,
        flowMode: getFlowModeFromSettings(settings)
      };
      setLocalSettings(uiSettings);
      setHasChanges(false);
    }
  }, [settings]);

  // Handle keyboard escape to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSettingChange = (key, value) => {
    let settingsToUpdate = { [key]: value };
    
    // Handle flowMode conversion
    if (key === 'flowMode') {
      const backendSettings = getSettingsFromFlowMode(value);
      settingsToUpdate = backendSettings;
    }
    
    const newSettings = { ...localSettings, ...settingsToUpdate };
    
    // If flowMode changed, update the UI flowMode as well
    if (key === 'flowMode') {
      newSettings.flowMode = value;
      // Update UI to reflect autoAdvance changes
      if (value === 'hybrid') {
        newSettings.autoAdvance = true;
      } else if (value === 'manual') {
        newSettings.autoAdvance = false;
      } else if (value === 'auto') {
        newSettings.autoAdvance = true;
      }
    }
    
    setLocalSettings(newSettings);
    setHasChanges(true);

    // Debounced auto-save using managed timeout
    timerManager.clearAll(); // Clear any existing save timeout
    timerManager.setTimeout(async () => {
      const success = await updateSettings(settingsToUpdate);
      if (success) {
        setHasChanges(false);
        showSuccess('設定を保存しました');
      } else {
        showError('設定の保存に失敗しました');
      }
    }, 1000);
  };

  const handleReset = async () => {
    if (confirm('すべての設定をデフォルトに戻しますか？')) {
      const success = await resetToDefaults();
      if (success) {
        setHasChanges(false);
        showSuccess('設定をリセットしました');
      } else {
        showError('設定のリセットに失敗しました');
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="settings-panel-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-panel">
          <div className="settings-panel__loading">
            <LoadingSkeleton type="text" count={4} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-panel-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-panel">
          <div className="settings-panel__error">
            <h3 className="settings-panel__error-title">⚠️ エラー</h3>
            <p className="settings-panel__error-message">{error}</p>
            <button onClick={onClose} className="settings-btn settings-btn--primary">
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="settings-panel-overlay" 
      onClick={handleOverlayClick}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="settings-title"
    >
      <div className="settings-panel">
        <header className="settings-panel__header">
          <div className="settings-panel__title-section">
            <h3 className="settings-panel__title" id="settings-title">
              <FiSettings className="settings-panel__title-icon" />
              ゲーム設定
            </h3>
            <div className="settings-panel__status">
              {hasChanges && (
                <span className="settings-status settings-status--unsaved" aria-live="polite">
                  <FiSave className="settings-status__icon" />
                  未保存の変更
                </span>
              )}
              {saving && (
                <span className="settings-status settings-status--saving" aria-live="polite">
                  <FiSave className="settings-status__icon settings-status__icon--spinning" />
                  保存中...
                </span>
              )}
            </div>
          </div>
          <div className="settings-panel__actions">
            <button 
              onClick={handleReset} 
              disabled={saving}
              className="settings-btn settings-btn--secondary"
              title="設定をデフォルトに戻す"
              type="button"
            >
              <FiRotateCcw className="settings-btn__icon" />
              リセット
            </button>
            <button 
              onClick={onClose}
              className="settings-btn settings-btn--close"
              title="設定パネルを閉じる"
              type="button"
              aria-label="設定パネルを閉じる"
            >
              <FiX className="settings-btn__icon" />
            </button>
          </div>
        </header>

        <main className="settings-panel__content">
          {Object.entries(settingsConfig).map(([categoryKey, category]) => (
            <SettingsCategory
              key={categoryKey}
              category={category}
              settings={localSettings}
              onChange={handleSettingChange}
              disabled={saving}
            />
          ))}
        </main>

        <footer className="settings-panel__footer">
          <div className="settings-summary">
            <p className="settings-summary__text">
              最大 <strong>{localSettings.maxPlayers || 50}人</strong>まで参加可能 • 
              進行モード: <strong>
                {localSettings.flowMode === 'manual' ? '手動進行' : 
                 localSettings.flowMode === 'hybrid' ? 'ハイブリッド' : '自動進行'}
              </strong> • 
              スコア計算: <strong>{localSettings.pointCalculation === 'time-bonus' ? '時間ボーナス付き' : '固定ポイント'}</strong>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default GameSettingsPanel;
