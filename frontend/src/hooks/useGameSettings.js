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
      
      console.log('Loading settings for questionSetId:', questionSetId);
      const response = await apiCall(`/game-settings/${questionSetId}`, {
        method: 'GET'
      });

      console.log('Settings API response:', response);
      
      if (response.success && response.settings) {
        console.log('Settings loaded successfully:', response.settings);
        setSettings(response.settings);
      } else {
        console.error('Settings API failed:', response.error || 'Unknown error');
        setError(response.error || 'Failed to load settings');
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
        console.log('🔄 Updating settings with game sync for gameId:', gameId);
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
