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
  // Use timeLimit in milliseconds (like QuestionRenderer) instead of converting to seconds
  const timeLimit = displayData.duration; // Keep in milliseconds
  const durationInSeconds = Math.ceil(timeLimit / 1000);
  const [timer, setTimer] = useState(durationInSeconds);
  const [isClosing, setIsClosing] = useState(false);

  // Timer logic matching QuestionRenderer - decrements every second
  useManagedInterval(
    () => {
      setTimer(prev => {
        if (prev <= 1) {
          // Start closing animation
          setIsClosing(true);
          // Complete after animation
          setTimeout(() => onComplete?.(), 300);
          return 0;
        }
        return prev - 1;
      });
    },
    1000, // 1 second interval like QuestionRenderer
    [onComplete]
  );

  // Binary rendering decision - no complex conditionals
  return (
    <PostQuestionDisplayErrorBoundary onComplete={onComplete}>
      {displayData.explanation ? (
        <WithExplanationLayout 
          displayData={displayData}
          timer={timer}
          timeLimit={timeLimit}
          isClosing={isClosing}
        />
      ) : (
        <LeaderboardOnlyLayout 
          displayData={displayData}
          timer={timer}
          timeLimit={timeLimit}
          isClosing={isClosing}
        />
      )}
    </PostQuestionDisplayErrorBoundary>
  );
};

export default PostQuestionDisplay;
