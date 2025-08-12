import { useState, useEffect, useRef, useContext, createContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  FaVolumeUp, 
  FaVolumeMute, 
  FaVolumeDown, 
  FaMusic, 
  FaBell,
  FaPlay,
  FaPause,
  FaCog,
  FaHeadphones
} from 'react-icons/fa';
import './AudioSystem.css';

/**
 * AudioSystem - Comprehensive Audio and Feedback Framework
 * Phase 5: Enhanced UX & Polish Implementation
 * 
 * Features:
 * - Sound effects for player interactions and game events
 * - Background music system with multiple tracks
 * - Volume controls with separate channels
 * - Audio accessibility features
 * - Performance optimization for mobile devices
 * - Context-based audio management
 * - Custom sound selection and presets
 */

// Audio Context for global audio state management
const AudioContext = createContext({
  isEnabled: true,
  masterVolume: 0.7,
  effectsVolume: 0.8,
  musicVolume: 0.5,
  currentTrack: null,
  isPlaying: false,
  isMuted: false,
  soundPreset: 'default',
  setMasterVolume: () => {},
  setEffectsVolume: () => {},
  setMusicVolume: () => {},
  toggleMute: () => {},
  playSound: () => {},
  playMusic: () => {},
  stopMusic: () => {},
  setSoundPreset: () => {}
});

// Custom hook for accessing audio context
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

// Sound effect definitions with multiple preset options
const SOUND_EFFECTS = {
  // Player interaction sounds
  playerJoin: {
    default: '/sounds/effects/player-join.mp3',
    cheerful: '/sounds/effects/welcome-chime.mp3',
    minimal: '/sounds/effects/soft-ping.mp3',
    retro: '/sounds/effects/arcade-join.mp3'
  },
  playerLeave: {
    default: '/sounds/effects/player-leave.mp3',
    cheerful: '/sounds/effects/gentle-goodbye.mp3',
    minimal: '/sounds/effects/soft-bell.mp3',
    retro: '/sounds/effects/arcade-leave.mp3'
  },
  playerAnswer: {
    default: '/sounds/effects/answer-submit.mp3',
    cheerful: '/sounds/effects/answer-pop.mp3',
    minimal: '/sounds/effects/click-soft.mp3',
    retro: '/sounds/effects/arcade-beep.mp3'
  },
  
  // Question and game progression
  questionStart: {
    default: '/sounds/effects/question-start.mp3',
    cheerful: '/sounds/effects/question-fanfare.mp3',
    minimal: '/sounds/effects/transition-whoosh.mp3',
    retro: '/sounds/effects/game-start.mp3'
  },
  questionEnd: {
    default: '/sounds/effects/question-end.mp3',
    cheerful: '/sounds/effects/time-up-bell.mp3',
    minimal: '/sounds/effects/soft-chime.mp3',
    retro: '/sounds/effects/time-up-buzzer.mp3'
  },
  correctAnswer: {
    default: '/sounds/effects/correct-answer.mp3',
    cheerful: '/sounds/effects/success-fanfare.mp3',
    minimal: '/sounds/effects/success-ping.mp3',
    retro: '/sounds/effects/arcade-success.mp3'
  },
  incorrectAnswer: {
    default: '/sounds/effects/incorrect-answer.mp3',
    cheerful: '/sounds/effects/gentle-buzz.mp3',
    minimal: '/sounds/effects/soft-error.mp3',
    retro: '/sounds/effects/arcade-miss.mp3'
  },
  
  // Timer and urgency
  timerWarning: {
    default: '/sounds/effects/timer-warning.mp3',
    cheerful: '/sounds/effects/countdown-tick.mp3',
    minimal: '/sounds/effects/timer-pulse.mp3',
    retro: '/sounds/effects/arcade-countdown.mp3'
  },
  timerCritical: {
    default: '/sounds/effects/timer-critical.mp3',
    cheerful: '/sounds/effects/urgent-bells.mp3',
    minimal: '/sounds/effects/critical-beep.mp3',
    retro: '/sounds/effects/alarm-beep.mp3'
  },
  
  // Achievements and celebrations
  achievement: {
    default: '/sounds/effects/achievement.mp3',
    cheerful: '/sounds/effects/celebration-fanfare.mp3',
    minimal: '/sounds/effects/achievement-chime.mp3',
    retro: '/sounds/effects/level-up.mp3'
  },
  podiumFirst: {
    default: '/sounds/effects/winner-fanfare.mp3',
    cheerful: '/sounds/effects/victory-celebration.mp3',
    minimal: '/sounds/effects/winner-chime.mp3',
    retro: '/sounds/effects/victory-theme.mp3'
  },
  podiumSecond: {
    default: '/sounds/effects/second-place.mp3',
    cheerful: '/sounds/effects/applause-short.mp3',
    minimal: '/sounds/effects/success-medium.mp3',
    retro: '/sounds/effects/second-fanfare.mp3'
  },
  podiumThird: {
    default: '/sounds/effects/third-place.mp3',
    cheerful: '/sounds/effects/congratulations.mp3',
    minimal: '/sounds/effects/success-small.mp3',
    retro: '/sounds/effects/third-fanfare.mp3'
  },
  
  // UI interactions
  buttonHover: {
    default: '/sounds/effects/button-hover.mp3',
    cheerful: '/sounds/effects/ui-pop.mp3',
    minimal: '/sounds/effects/hover-whisper.mp3',
    retro: '/sounds/effects/menu-beep.mp3'
  },
  buttonClick: {
    default: '/sounds/effects/button-click.mp3',
    cheerful: '/sounds/effects/ui-click.mp3',
    minimal: '/sounds/effects/click-soft.mp3',
    retro: '/sounds/effects/menu-select.mp3'
  },
  modalOpen: {
    default: '/sounds/effects/modal-open.mp3',
    cheerful: '/sounds/effects/panel-slide.mp3',
    minimal: '/sounds/effects/soft-whoosh.mp3',
    retro: '/sounds/effects/screen-transition.mp3'
  },
  notification: {
    default: '/sounds/effects/notification.mp3',
    cheerful: '/sounds/effects/alert-gentle.mp3',
    minimal: '/sounds/effects/notification-subtle.mp3',
    retro: '/sounds/effects/alert-retro.mp3'
  }
};

// Background music tracks
const BACKGROUND_MUSIC = {
  lobby: {
    default: '/sounds/music/lobby-ambient.mp3',
    upbeat: '/sounds/music/lobby-energetic.mp3',
    chill: '/sounds/music/lobby-relaxed.mp3',
    focus: '/sounds/music/lobby-concentration.mp3'
  },
  gameActive: {
    default: '/sounds/music/game-background.mp3',
    upbeat: '/sounds/music/game-energetic.mp3',
    chill: '/sounds/music/game-calm.mp3',
    focus: '/sounds/music/game-focus.mp3'
  },
  results: {
    default: '/sounds/music/results-celebration.mp3',
    upbeat: '/sounds/music/results-party.mp3',
    chill: '/sounds/music/results-pleasant.mp3',
    focus: '/sounds/music/results-reflection.mp3'
  }
};

// Audio Provider Component
export function AudioProvider({ children }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [effectsVolume, setEffectsVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [soundPreset, setSoundPreset] = useState('default');
  const [musicPreset, setMusicPreset] = useState('default');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio elements refs
  const audioRefs = useRef(new Map());
  const musicRef = useRef(null);
  const audioContext = useRef(null);
  const gainNode = useRef(null);

  // Initialize Web Audio API for better control
  useEffect(() => {
    try {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNode.current = audioContext.current.createGain();
      gainNode.current.connect(audioContext.current.destination);
    } catch (error) {
      console.warn('Web Audio API not supported, falling back to HTML5 audio');
    }
  }, []);

  // Load audio preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('tuiz-audio-preferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setIsEnabled(prefs.isEnabled ?? true);
        setMasterVolume(prefs.masterVolume ?? 0.7);
        setEffectsVolume(prefs.effectsVolume ?? 0.8);
        setMusicVolume(prefs.musicVolume ?? 0.5);
        setIsMuted(prefs.isMuted ?? false);
        setSoundPreset(prefs.soundPreset ?? 'default');
        setMusicPreset(prefs.musicPreset ?? 'default');
      } catch (error) {
        console.warn('Failed to load audio preferences:', error);
      }
    }
  }, []);

  // Save audio preferences to localStorage
  useEffect(() => {
    const prefs = {
      isEnabled,
      masterVolume,
      effectsVolume,
      musicVolume,
      isMuted,
      soundPreset,
      musicPreset
    };
    localStorage.setItem('tuiz-audio-preferences', JSON.stringify(prefs));
  }, [isEnabled, masterVolume, effectsVolume, musicVolume, isMuted, soundPreset, musicPreset]);

  // Update global volume when settings change
  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = isMuted ? 0 : masterVolume;
    }
  }, [masterVolume, isMuted]);

  // Preload commonly used sound effects
  useEffect(() => {
    const preloadSounds = [
      'playerJoin', 'playerAnswer', 'correctAnswer', 'incorrectAnswer',
      'timerWarning', 'buttonClick', 'notification'
    ];

    preloadSounds.forEach(soundName => {
      if (SOUND_EFFECTS[soundName] && SOUND_EFFECTS[soundName][soundPreset]) {
        const audio = new Audio(SOUND_EFFECTS[soundName][soundPreset]);
        audio.preload = 'auto';
        audioRefs.current.set(soundName, audio);
      }
    });
  }, [soundPreset]);

  // Play sound effect
  const playSound = useCallback((soundName, options = {}) => {
    if (!isEnabled || isMuted) return;

    const {
      volume = 1,
      loop = false,
      playbackRate = 1,
      delay = 0
    } = options;

    const soundPath = SOUND_EFFECTS[soundName]?.[soundPreset];
    if (!soundPath) {
      console.warn(`Sound effect '${soundName}' not found for preset '${soundPreset}'`);
      return;
    }

    const playAudio = () => {
      try {
        let audio = audioRefs.current.get(soundName);
        
        if (!audio) {
          audio = new Audio(soundPath);
          audioRefs.current.set(soundName, audio);
        }

        // Reset audio to beginning
        audio.currentTime = 0;
        audio.volume = Math.min(1, (masterVolume * effectsVolume * volume));
        audio.loop = loop;
        audio.playbackRate = playbackRate;

        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(error => {
            console.warn('Audio play failed:', error);
          });
        }

        return audio;
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    };

    if (delay > 0) {
      setTimeout(playAudio, delay);
    } else {
      return playAudio();
    }
  }, [isEnabled, isMuted, masterVolume, effectsVolume, soundPreset]);

  // Play background music
  const playMusic = useCallback((trackName, options = {}) => {
    if (!isEnabled || isMuted) return;

    const {
      loop = true,
      fadeIn = 1000,
      volume = 1
    } = options;

    const musicPath = BACKGROUND_MUSIC[trackName]?.[musicPreset];
    if (!musicPath) {
      console.warn(`Music track '${trackName}' not found for preset '${musicPreset}'`);
      return;
    }

    // Stop current music if playing
    if (musicRef.current) {
      stopMusic();
    }

    try {
      musicRef.current = new Audio(musicPath);
      musicRef.current.loop = loop;
      musicRef.current.volume = 0; // Start silent for fade in

      const playPromise = musicRef.current.play();
      if (playPromise) {
        playPromise.then(() => {
          setCurrentTrack(trackName);
          setIsPlaying(true);

          // Fade in music
          if (fadeIn > 0) {
            const targetVolume = Math.min(1, (masterVolume * musicVolume * volume));
            const fadeSteps = 20;
            const stepTime = fadeIn / fadeSteps;
            const volumeStep = targetVolume / fadeSteps;
            let currentStep = 0;

            const fadeInterval = setInterval(() => {
              if (musicRef.current && currentStep < fadeSteps) {
                currentStep++;
                musicRef.current.volume = volumeStep * currentStep;
              } else {
                clearInterval(fadeInterval);
              }
            }, stepTime);
          } else {
            musicRef.current.volume = Math.min(1, (masterVolume * musicVolume * volume));
          }
        }).catch(error => {
          console.warn('Music play failed:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to play music:', error);
    }
  }, [isEnabled, isMuted, masterVolume, musicVolume, musicPreset]);

  // Stop background music
  const stopMusic = useCallback((fadeOut = 1000) => {
    if (!musicRef.current) return;

    if (fadeOut > 0) {
      const currentVolume = musicRef.current.volume;
      const fadeSteps = 20;
      const stepTime = fadeOut / fadeSteps;
      const volumeStep = currentVolume / fadeSteps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        if (musicRef.current && currentStep < fadeSteps) {
          currentStep++;
          musicRef.current.volume = currentVolume - (volumeStep * currentStep);
        } else {
          if (musicRef.current) {
            musicRef.current.pause();
            musicRef.current = null;
          }
          setCurrentTrack(null);
          setIsPlaying(false);
          clearInterval(fadeInterval);
        }
      }, stepTime);
    } else {
      musicRef.current.pause();
      musicRef.current = null;
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Update music volume in real-time
  useEffect(() => {
    if (musicRef.current && isPlaying) {
      musicRef.current.volume = Math.min(1, (masterVolume * musicVolume));
    }
  }, [masterVolume, musicVolume, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
      }
      audioRefs.current.forEach(audio => {
        audio.pause();
      });
      audioRefs.current.clear();
    };
  }, []);

  const contextValue = {
    isEnabled,
    masterVolume,
    effectsVolume,
    musicVolume,
    currentTrack,
    isPlaying,
    isMuted,
    soundPreset,
    musicPreset,
    setIsEnabled,
    setMasterVolume,
    setEffectsVolume,
    setMusicVolume,
    setSoundPreset,
    setMusicPreset,
    toggleMute,
    playSound,
    playMusic,
    stopMusic
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
}

AudioProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Audio Controls Component
export function AudioControls({ compact = false, showPresets = true }) {
  const {
    isEnabled,
    masterVolume,
    effectsVolume,
    musicVolume,
    isMuted,
    soundPreset,
    musicPreset,
    currentTrack,
    isPlaying,
    setIsEnabled,
    setMasterVolume,
    setEffectsVolume,
    setMusicVolume,
    setSoundPreset,
    setMusicPreset,
    toggleMute,
    playSound,
    stopMusic
  } = useAudio();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTestSound = () => {
    playSound('buttonClick');
  };

  const handleStopMusic = () => {
    stopMusic(500);
  };

  const getVolumeIcon = () => {
    if (isMuted || !isEnabled) return FaVolumeMute;
    if (masterVolume < 0.3) return FaVolumeDown;
    return FaVolumeUp;
  };

  const VolumeIcon = getVolumeIcon();

  if (compact) {
    return (
      <div className="audio-controls audio-controls--compact">
        <button
          className={`audio-control-btn ${isMuted || !isEnabled ? 'audio-control-btn--muted' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          <VolumeIcon />
        </button>
        
        <div className="volume-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="volume-slider"
            disabled={!isEnabled}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="audio-controls">
      <div className="audio-controls-header">
        <h3 className="audio-controls-title">
          <FaHeadphones className="audio-controls-icon" />
          Audio Settings
        </h3>
        
        <div className="audio-controls-actions">
          <button
            className={`audio-control-btn ${!isEnabled ? 'audio-control-btn--disabled' : ''}`}
            onClick={() => setIsEnabled(!isEnabled)}
            title={isEnabled ? 'Disable audio' : 'Enable audio'}
          >
            <FaHeadphones />
          </button>
          
          <button
            className={`audio-control-btn ${isMuted ? 'audio-control-btn--muted' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            disabled={!isEnabled}
          >
            <VolumeIcon />
          </button>
        </div>
      </div>

      <div className="audio-controls-content">
        {/* Master Volume */}
        <div className="volume-control">
          <label className="volume-label">
            <VolumeIcon className="volume-icon" />
            Master Volume
          </label>
          <div className="volume-slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="volume-slider"
              disabled={!isEnabled || isMuted}
            />
            <span className="volume-value">{Math.round(masterVolume * 100)}%</span>
          </div>
        </div>

        {/* Effects Volume */}
        <div className="volume-control">
          <label className="volume-label">
            <FaBell className="volume-icon" />
            Sound Effects
          </label>
          <div className="volume-slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={effectsVolume}
              onChange={(e) => setEffectsVolume(parseFloat(e.target.value))}
              className="volume-slider"
              disabled={!isEnabled || isMuted}
            />
            <span className="volume-value">{Math.round(effectsVolume * 100)}%</span>
          </div>
          <button
            className="test-sound-btn"
            onClick={handleTestSound}
            disabled={!isEnabled || isMuted}
          >
            Test
          </button>
        </div>

        {/* Music Volume */}
        <div className="volume-control">
          <label className="volume-label">
            <FaMusic className="volume-icon" />
            Background Music
          </label>
          <div className="volume-slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="volume-slider"
              disabled={!isEnabled || isMuted}
            />
            <span className="volume-value">{Math.round(musicVolume * 100)}%</span>
          </div>
          {currentTrack && (
            <div className="current-track">
              <span className="track-info">
                {isPlaying ? <FaPlay className="track-icon" /> : <FaPause className="track-icon" />}
                Playing: {currentTrack}
              </span>
              <button
                className="stop-music-btn"
                onClick={handleStopMusic}
                disabled={!isEnabled}
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <FaCog className="advanced-icon" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>

        {showAdvanced && showPresets && (
          <div className="advanced-settings">
            {/* Sound Preset */}
            <div className="preset-control">
              <label className="preset-label">Sound Theme</label>
              <select
                value={soundPreset}
                onChange={(e) => setSoundPreset(e.target.value)}
                className="preset-select"
                disabled={!isEnabled}
              >
                <option value="default">Default</option>
                <option value="cheerful">Cheerful</option>
                <option value="minimal">Minimal</option>
                <option value="retro">Retro</option>
              </select>
            </div>

            {/* Music Preset */}
            <div className="preset-control">
              <label className="preset-label">Music Style</label>
              <select
                value={musicPreset}
                onChange={(e) => setMusicPreset(e.target.value)}
                className="preset-select"
                disabled={!isEnabled}
              >
                <option value="default">Default</option>
                <option value="upbeat">Upbeat</option>
                <option value="chill">Chill</option>
                <option value="focus">Focus</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

AudioControls.propTypes = {
  compact: PropTypes.bool,
  showPresets: PropTypes.bool
};

// Sound Effect Hook for easy integration
export function useSoundEffects() {
  const { playSound } = useAudio();

  return {
    // Player actions
    onPlayerJoin: () => playSound('playerJoin'),
    onPlayerLeave: () => playSound('playerLeave'),
    onPlayerAnswer: () => playSound('playerAnswer'),
    
    // Game progression
    onQuestionStart: () => playSound('questionStart'),
    onQuestionEnd: () => playSound('questionEnd'),
    onCorrectAnswer: () => playSound('correctAnswer'),
    onIncorrectAnswer: () => playSound('incorrectAnswer'),
    
    // Timer events
    onTimerWarning: () => playSound('timerWarning'),
    onTimerCritical: () => playSound('timerCritical'),
    
    // Achievements
    onAchievement: () => playSound('achievement'),
    onFirstPlace: () => playSound('podiumFirst'),
    onSecondPlace: () => playSound('podiumSecond'),
    onThirdPlace: () => playSound('podiumThird'),
    
    // UI interactions
    onButtonHover: () => playSound('buttonHover', { volume: 0.3 }),
    onButtonClick: () => playSound('buttonClick'),
    onModalOpen: () => playSound('modalOpen'),
    onNotification: () => playSound('notification'),
    
    // Custom sound with options
    playCustomSound: (soundName, options) => playSound(soundName, options)
  };
}

// Background Music Hook for easy integration
export function useBackgroundMusic() {
  const { playMusic, stopMusic, currentTrack, isPlaying } = useAudio();

  return {
    playLobbyMusic: (options) => playMusic('lobby', options),
    playGameMusic: (options) => playMusic('gameActive', options),
    playResultsMusic: (options) => playMusic('results', options),
    stopMusic: (fadeOut) => stopMusic(fadeOut),
    currentTrack,
    isPlaying
  };
}

export default AudioProvider;
