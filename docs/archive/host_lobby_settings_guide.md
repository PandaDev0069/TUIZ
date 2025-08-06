# Host Lobby Settings Implementation Guide

## Overview
The game settings system allows hosts to customize gameplay parameters in real-time during the lobby phase. Settings are managed through a clean API that merges question set defaults with game-specific overrides.

## API Endpoints

### GET /api/game-settings/:gameId
Retrieves current game settings with defaults and overrides.
```javascript
{
  "success": true,
  "gameId": "game_123",
  "settings": {
    "questionTimeLimit": 30,
    "skipOption": false,
    "showCorrectAnswer": true,
    "explanationDisplay": false,
    "pointsPerCorrect": 100,
    "timeBonusEnabled": false,
    "negativePoints": false,
    "intermediateScoreboard": false,
    "autoNextQuestion": false,
    "shuffleQuestions": false,
    "shuffleAnswers": true
  },
  "defaults": { /* question set defaults */ },
  "overrides": { /* game-specific overrides */ }
}
```

### PUT /api/game-settings/:gameId
Updates specific game settings (only works in lobby phase).
```javascript
// Request
{
  "settings": {
    "questionTimeLimit": 45,
    "skipOption": true,
    "pointsPerCorrect": 150
  }
}

// Response
{
  "success": true,
  "gameId": "game_123",
  "settings": { /* updated settings */ }
}
```

### PUT /api/game-settings/:gameId/reset
Resets all game settings to question set defaults.

## Frontend Implementation Recommendations

### 1. Settings Categories
Group settings into logical sections:

```javascript
const settingsConfig = {
  gameplay: {
    title: "Gameplay",
    icon: "⏱️",
    settings: [
      {
        key: "questionTimeLimit",
        label: "Time Limit",
        type: "slider",
        min: 10,
        max: 120,
        step: 5,
        unit: "seconds"
      },
      {
        key: "skipOption",
        label: "Allow Skip",
        type: "toggle",
        description: "Players can skip questions"
      },
      {
        key: "showCorrectAnswer",
        label: "Show Correct Answer",
        type: "toggle",
        description: "Display correct answer after each question"
      }
    ]
  },
  scoring: {
    title: "Scoring",
    icon: "🏆",
    settings: [
      {
        key: "pointsPerCorrect",
        label: "Points per Correct",
        type: "number",
        min: 50,
        max: 500,
        step: 25
      },
      {
        key: "timeBonusEnabled",
        label: "Time Bonus",
        type: "toggle",
        description: "Extra points for quick answers"
      },
      {
        key: "negativePoints",
        label: "Negative Points",
        type: "toggle",
        description: "Deduct points for wrong answers"
      }
    ]
  },
  flow: {
    title: "Game Flow",
    icon: "🎯",
    settings: [
      {
        key: "shuffleQuestions",
        label: "Shuffle Questions",
        type: "toggle"
      },
      {
        key: "shuffleAnswers",
        label: "Shuffle Answers",
        type: "toggle"
      },
      {
        key: "autoNextQuestion",
        label: "Auto Next",
        type: "toggle",
        description: "Automatically advance to next question"
      }
    ]
  }
};
```

### 2. React Hook for Settings Management

```javascript
// hooks/useGameSettings.js
import { useState, useEffect } from 'react';

export const useGameSettings = (gameId) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/game-settings/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/game-settings/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ settings: newSettings })
      });
      
      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, ...newSettings }));
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to update settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/game-settings/${gameId}/reset`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to reset settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (gameId) {
      loadSettings();
    }
  }, [gameId]);

  return {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    resetToDefaults,
    refetch: loadSettings
  };
};
```

### 3. Settings Components

```javascript
// components/GameSettingsPanel.jsx
const GameSettingsPanel = ({ gameId, onClose }) => {
  const { settings, loading, saving, error, updateSettings, resetToDefaults } = useGameSettings(gameId);
  const [localSettings, setLocalSettings] = useState({});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    // Debounced auto-save
    clearTimeout(window.settingsTimeout);
    window.settingsTimeout = setTimeout(() => {
      updateSettings({ [key]: value });
    }, 500);
  };

  const handleReset = async () => {
    if (confirm('Reset all settings to question set defaults?')) {
      const success = await resetToDefaults();
      if (success) {
        // Show success toast
      }
    }
  };

  if (loading) return <div>Loading settings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="game-settings-panel">
      <div className="settings-header">
        <h3>Game Settings</h3>
        <div className="settings-actions">
          <button onClick={handleReset} disabled={saving}>
            Reset to Defaults
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      
      {Object.entries(settingsConfig).map(([categoryKey, category]) => (
        <SettingsCategory
          key={categoryKey}
          category={category}
          settings={localSettings}
          onChange={handleSettingChange}
          disabled={saving}
        />
      ))}
      
      {saving && <div className="saving-indicator">Saving...</div>}
    </div>
  );
};
```

## Key Benefits

1. **Real-time Updates**: Settings save automatically with debouncing
2. **Type Safety**: Validated settings with proper types and ranges  
3. **Inheritance**: Game settings override question set defaults cleanly
4. **Reset Option**: Easy return to question set defaults
5. **Lobby Only**: Settings can only be changed during lobby phase
6. **Host Security**: Only game hosts can modify settings

## Integration Points

- Add settings button to host lobby UI
- Socket.io events for real-time settings sync to players
- Settings preview in game creation flow
- Mobile-responsive settings panel design

This system provides a clean, secure, and user-friendly way for hosts to customize their games without complexity!
