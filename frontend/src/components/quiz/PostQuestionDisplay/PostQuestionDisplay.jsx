import React, { useState } from 'react';
import { useManagedInterval } from '../../../utils/timerManager';
import WithExplanationLayout from './WithExplanationLayout';
import LeaderboardOnlyLayout from './LeaderboardOnlyLayout';
import PostQuestionDisplayErrorBoundary from './PostQuestionDisplayErrorBoundary';
import './PostQuestionDisplay.css';

/**
 * PostQuestionDisplay - Clean, simplified post-question display component
 * 
 * Props:
 * - displayData: Single unified data object containing all needed information
 * - onComplete: Callback function when display period ends
 * 
 * Architecture:
 * - Binary logic: explanation exists → WithExplanationLayout, else → LeaderboardOnlyLayout
 * - Single timer system for both scenarios
 * - No complex state management or conditional logic
 */
const PostQuestionDisplay = ({ displayData, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(displayData.duration);
  const [isClosing, setIsClosing] = useState(false);

  // Simple timer logic - decrements every 100ms
  useManagedInterval(
    () => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          // Start closing animation
          setIsClosing(true);
          // Complete after animation
          setTimeout(() => onComplete?.(), 300);
          return 0;
        }
        return prev - 100;
      });
    },
    100,
    [onComplete]
  );

  // Calculate progress percentage for timer display
  const progressPercent = (timeLeft / displayData.duration) * 100;

  // Binary rendering decision - no complex conditionals
  return (
    <PostQuestionDisplayErrorBoundary onComplete={onComplete}>
      {displayData.explanation ? (
        <WithExplanationLayout 
          displayData={displayData}
          timeLeft={timeLeft}
          progressPercent={progressPercent}
          isClosing={isClosing}
        />
      ) : (
        <LeaderboardOnlyLayout 
          displayData={displayData}
          timeLeft={timeLeft}
          progressPercent={progressPercent}
          isClosing={isClosing}
        />
      )}
    </PostQuestionDisplayErrorBoundary>
  );
};

export default PostQuestionDisplay;
