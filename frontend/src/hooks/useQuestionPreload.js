/**
 * useQuestionPreload.js
 * 
 * Custom hook for managing question and image preloading
 * in the waiting room phase.
 */

import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import imagePreloader from '../services/ImagePreloader';

const useQuestionPreload = (gameCode, isWaitingRoom = false) => {
  const [preloadState, setPreloadState] = useState({
    isPreloading: false,
    questionsLoaded: false,
    imagesLoaded: false,
    error: null,
    progress: {
      questions: 0,
      images: 0,
      overall: 0
    },
    stats: {
      totalQuestions: 0,
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0
    }
  });

  const [questions, setQuestions] = useState([]);

  // Reset preload state
  const resetPreloadState = useCallback(() => {
    setPreloadState({
      isPreloading: false,
      questionsLoaded: false,
      imagesLoaded: false,
      error: null,
      progress: {
        questions: 0,
        images: 0,
        overall: 0
      },
      stats: {
        totalQuestions: 0,
        totalImages: 0,
        loadedImages: 0,
        failedImages: 0
      }
    });
    setQuestions([]);
    imagePreloader.clearCache();
  }, []);

  // Start preloading process
  const startPreload = useCallback(async () => {
    if (!gameCode || !isWaitingRoom || preloadState.isPreloading) return;

    console.log('🔄 Starting question preload for game:', gameCode);
    
    setPreloadState(prev => ({
      ...prev,
      isPreloading: true,
      error: null
    }));

    try {
      // Request questions from server
      socket.emit('preloadQuestions', { gameCode });
    } catch (error) {
      console.error('❌ Error starting preload:', error);
      setPreloadState(prev => ({
        ...prev,
        isPreloading: false,
        error: error.message
      }));
    }
  }, [gameCode, isWaitingRoom, preloadState.isPreloading]);

  // Handle image preloading
  const preloadImages = useCallback(async (questionsData) => {
    if (!questionsData || questionsData.length === 0) {
      setPreloadState(prev => ({
        ...prev,
        imagesLoaded: true,
        progress: { ...prev.progress, images: 100, overall: 100 }
      }));
      return;
    }

    console.log('🖼️ Starting image preload for', questionsData.length, 'questions');

    // Update stats
    const totalImages = imagePreloader.extractImageUrls(questionsData).length;
    setPreloadState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalImages
      }
    }));

    // Progress callback for image loading
    const onImageProgress = (loaded, total, percentage) => {
      setPreloadState(prev => {
        const questionsProgress = prev.progress.questions;
        const imagesProgress = percentage;
        const overallProgress = Math.round((questionsProgress + imagesProgress) / 2);

        return {
          ...prev,
          progress: {
            questions: questionsProgress,
            images: imagesProgress,
            overall: overallProgress
          },
          stats: {
            ...prev.stats,
            loadedImages: loaded,
            failedImages: total - loaded
          }
        };
      });
    };

    try {
      // Start with critical images (first question)
      await imagePreloader.preloadCriticalImages(questionsData, onImageProgress);
      
      // Then preload all images
      const result = await imagePreloader.preloadQuestionImages(questionsData, onImageProgress);
      
      console.log('✅ Image preload complete:', result);
      
      setPreloadState(prev => ({
        ...prev,
        imagesLoaded: true,
        progress: { ...prev.progress, images: 100, overall: 100 },
        stats: {
          ...prev.stats,
          loadedImages: result.stats.loaded,
          failedImages: result.stats.failed
        }
      }));

    } catch (error) {
      console.error('❌ Error preloading images:', error);
      setPreloadState(prev => ({
        ...prev,
        error: `Image preloading failed: ${error.message}`,
        imagesLoaded: false
      }));
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!isWaitingRoom) return;

    // Handle successful question preload
    const handleQuestionPreload = (data) => {
      console.log('📚 Received preload data:', data);
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setPreloadState(prev => ({
          ...prev,
          questionsLoaded: true,
          progress: { ...prev.progress, questions: 100 },
          stats: {
            ...prev.stats,
            totalQuestions: data.questions.length
          }
        }));

        // Start image preloading
        preloadImages(data.questions);
      } else {
        console.warn('⚠️ No questions received in preload data');
        setPreloadState(prev => ({
          ...prev,
          questionsLoaded: true,
          imagesLoaded: true,
          progress: { questions: 100, images: 100, overall: 100 },
          isPreloading: false
        }));
      }
    };

    // Handle preload errors
    const handlePreloadError = (error) => {
      console.error('❌ Preload error:', error);
      setPreloadState(prev => ({
        ...prev,
        isPreloading: false,
        error: error.message || 'Failed to preload questions'
      }));
    };

    socket.on('questionPreload', handleQuestionPreload);
    socket.on('preloadError', handlePreloadError);

    return () => {
      socket.off('questionPreload', handleQuestionPreload);
      socket.off('preloadError', handlePreloadError);
    };
  }, [isWaitingRoom, preloadImages]);

  // Auto-start preload when entering waiting room
  useEffect(() => {
    if (isWaitingRoom && gameCode && !preloadState.isPreloading && !preloadState.questionsLoaded) {
      // Small delay to ensure socket connection is stable
      const timer = setTimeout(() => {
        startPreload();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isWaitingRoom, gameCode, startPreload, preloadState.isPreloading, preloadState.questionsLoaded]);

  // Cleanup on unmount or when leaving waiting room
  useEffect(() => {
    if (!isWaitingRoom) {
      resetPreloadState();
    }

    return () => {
      if (!isWaitingRoom) {
        resetPreloadState();
      }
    };
  }, [isWaitingRoom, resetPreloadState]);

  // Computed properties
  const isComplete = preloadState.questionsLoaded && preloadState.imagesLoaded;
  const isLoading = preloadState.isPreloading && !isComplete;
  const hasError = !!preloadState.error;

  return {
    // State
    isPreloading: isLoading,
    isComplete,
    hasError,
    error: preloadState.error,
    
    // Progress
    progress: preloadState.progress,
    stats: preloadState.stats,
    
    // Data
    questions,
    
    // Actions
    startPreload,
    resetPreloadState,
    
    // Utilities
    isImagePreloaded: imagePreloader.isImagePreloaded.bind(imagePreloader),
    getPreloadedImage: imagePreloader.getPreloadedImage.bind(imagePreloader)
  };
};

export default useQuestionPreload;
