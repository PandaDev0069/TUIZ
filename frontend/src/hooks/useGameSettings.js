import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useGameSettings = (questionSetId, gameId = null) => {
  const { apiCall } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadSettings = async () => {
    if (!questionSetId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Choose API endpoint based on whether we have an active game
      let apiUrl, logMessage;
      if (gameId) {
        // Load current game settings (from active room)
        apiUrl = `/game-settings/game/${gameId}`;
        logMessage = `Loading game settings for gameId: ${gameId}`;
      } else {
        // Load question set default settings
        apiUrl = `/game-settings/${questionSetId}`;
        logMessage = `Loading settings for questionSetId: ${questionSetId}`;
      }
      
      console.log(logMessage);
      
      const response = await apiCall(apiUrl, {
        method: 'GET'
      });

      console.log('Settings API response:', response);
      
      if (response.success && response.settings) {
        console.log('Settings loaded successfully:', response.settings);
        setSettings(response.settings);
      } else {
        // If game-specific settings failed and we have a gameId, try question set defaults
        if (gameId && apiUrl.includes('/game/')) {
          console.warn(`⚠️ Game settings failed for gameId ${gameId}, falling back to question set defaults`);
          
          const fallbackResponse = await apiCall(`/game-settings/${questionSetId}`, {
            method: 'GET'
          });
          
          if (fallbackResponse.success && fallbackResponse.settings) {
            console.log('✅ Fallback settings loaded successfully:', fallbackResponse.settings);
            setSettings(fallbackResponse.settings);
          } else {
            console.error('❌ Both game and question set settings failed:', fallbackResponse.error || 'Unknown error');
            setError(fallbackResponse.error || 'Failed to load settings');
          }
        } else {
          console.error('Settings API failed:', response.error || 'Unknown error');
          setError(response.error || 'Failed to load settings');
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    if (!questionSetId) return false;

    try {
      setSaving(true);
      setError(null);

      // Include gameId for sync if available
      const requestBody = { 
        settings: newSettings 
      };
      
      if (gameId) {
        requestBody.gameId = gameId;
      }

      const response = await apiCall(`/game-settings/${questionSetId}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });

      if (response.success && response.settings) {
        // Merge new settings with existing ones
        setSettings(prev => ({ ...prev, ...response.settings }));
        return true;
      } else {
        setError(response.error || 'Failed to update settings');
        return false;
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError('Failed to update settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!questionSetId) return false;

    try {
      setSaving(true);
      setError(null);

      const response = await apiCall(`/game-settings/${questionSetId}/reset`, {
        method: 'PUT'
      });

      if (response.success && response.settings) {
        setSettings(response.settings);
        return true;
      } else {
        setError(response.error || 'Failed to reset settings');
        return false;
      }
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError('Failed to reset settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [questionSetId]);

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
