import React, { useState, useEffect } from 'react';
import { useGameSettings } from '../hooks/useGameSettings';
import { showSuccess, showError } from '../utils/toast';
import LoadingSkeleton from './LoadingSkeleton';
import { useManagedTimeout } from '../utils/timerManager';
import './gameSettingsPanel.css';

const settingsConfig = {
  gameFlow: {
    title: "ゲームフロー",
    icon: "🎯",
    settings: [
      {
        key: "autoAdvance",
        label: "自動進行",
        type: "toggle",
        description: "時間切れで自動的に次の問題へ進む"
      },
      {
        key: "showExplanations", 
        label: "解説表示",
        type: "toggle",
        description: "各問題の後に解説を表示"
      },
      {
        key: "explanationTime",
        label: "解説表示時間",
        type: "slider",
        min: 10,
        max: 120,
        step: 5,
        unit: "秒",
        dependsOn: "showExplanations"
      }
    ]
  },
  scoring: {
    title: "スコア・ポイント", 
    icon: "🏆",
    settings: [
      {
        key: "pointCalculation",
        label: "ポイント計算",
        type: "select",
        options: [
          { value: "fixed", label: "固定ポイント" },
          { value: "time-bonus", label: "時間ボーナス付き" }
        ],
        description: "正解時のポイント計算方法"
      },
      {
        key: "streakBonus",
        label: "連続正解ボーナス",
        type: "toggle",
        description: "連続で正解した場合にボーナスポイント"
      }
    ]
  },
  display: {
    title: "表示オプション",
    icon: "👁️",
    settings: [
      {
        key: "showProgress",
        label: "進捗表示",
        type: "toggle", 
        description: "現在の問題数を表示（例：「問題 X / Y」）"
      },
      {
        key: "showCorrectAnswer",
        label: "正解表示",
        type: "toggle",
        description: "時間切れ後に正解をハイライト"
      },
      {
        key: "showLeaderboard",
        label: "リーダーボード",
        type: "toggle",
        description: "各問題後にリーダーボードを表示"
      }
    ]
  },
  advanced: {
    title: "高度な設定",
    icon: "⚙️",
    settings: [
      {
        key: "maxPlayers",
        label: "最大参加者数",
        type: "slider",
        min: 2,
        max: 300,
        step: 1,
        unit: "人"
      },
      {
        key: "spectatorMode",
        label: "観戦モード",
        type: "toggle",
        description: "参加していないユーザーも観戦可能"
      },
      {
        key: "allowAnswerChange",
        label: "回答変更",
        type: "toggle", 
        description: "時間内での回答変更を許可"
      }
    ]
  }
};

const SettingControl = ({ setting, value, onChange, disabled }) => {
  const handleChange = (newValue) => {
    onChange(setting.key, newValue);
  };

  switch (setting.type) {
    case 'toggle':
      return (
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="toggle-slider"></span>
        </label>
      );

    case 'slider':
      return (
        <div className="setting-slider-container">
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={value || setting.min}
            onChange={(e) => handleChange(parseInt(e.target.value))}
            disabled={disabled}
            className="setting-slider"
          />
          <span className="slider-value">
            {value || setting.min}{setting.unit}
          </span>
        </div>
      );

    case 'select':
      return (
        <select
          value={value || setting.options[0].value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="setting-select"
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

const SettingsCategory = ({ category, settings, onChange, disabled }) => {
  return (
    <div className="settings-category">
      <div className="category-header">
        <span className="category-icon">{category.icon}</span>
        <h4 className="category-title">{category.title}</h4>
      </div>
      
      <div className="category-settings">
        {category.settings.map(setting => {
          // Check if setting should be shown based on dependencies
          if (setting.dependsOn && !settings[setting.dependsOn]) {
            return null;
          }

          return (
            <div key={setting.key} className="setting-item">
              <div className="setting-info">
                <label className="setting-label">{setting.label}</label>
                {setting.description && (
                  <span className="setting-description">{setting.description}</span>
                )}
              </div>
              <div className="setting-control">
                <SettingControl
                  setting={setting}
                  value={settings[setting.key]}
                  onChange={onChange}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GameSettingsPanel = ({ questionSetId, gameId, onClose }) => {
  const { settings, loading, saving, error, updateSettings, resetToDefaults } = useGameSettings(questionSetId, gameId);
  const [localSettings, setLocalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const managedTimeout = useManagedTimeout();

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);

    // Debounced auto-save using managed timeout
    managedTimeout.clearAll(); // Clear any existing save timeout
    managedTimeout.setTimeout(async () => {
      const success = await updateSettings({ [key]: value });
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

  if (loading) {
    return (
      <div className="settings-panel-overlay">
        <div className="settings-panel">
          <div className="settings-loading">
            <LoadingSkeleton type="text" count={4} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-panel-overlay">
        <div className="settings-panel">
          <div className="settings-error">
            <h3>❌ エラー</h3>
            <p>{error}</p>
            <button onClick={onClose} className="settings-button">閉じる</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <div className="settings-header">
          <div className="settings-title">
            <h3>⚙️ ゲーム設定</h3>
            {hasChanges && <span className="changes-indicator">未保存の変更</span>}
            {saving && <span className="saving-indicator">保存中...</span>}
          </div>
          <div className="settings-actions">
            <button 
              onClick={handleReset} 
              disabled={saving}
              className="settings-button reset-button"
            >
              リセット
            </button>
            <button 
              onClick={onClose}
              className="settings-button close-button"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="settings-content">
          {Object.entries(settingsConfig).map(([categoryKey, category]) => (
            <SettingsCategory
              key={categoryKey}
              category={category}
              settings={localSettings}
              onChange={handleSettingChange}
              disabled={saving}
            />
          ))}
        </div>

        <div className="settings-footer">
          <div className="settings-summary">
            <p>
              最大 <strong>{localSettings.maxPlayers || 50}人</strong>まで参加可能 • 
              自動進行: <strong>{localSettings.autoAdvance ? 'ON' : 'OFF'}</strong> • 
              解説表示: <strong>{localSettings.showExplanations ? 'ON' : 'OFF'}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSettingsPanel;
