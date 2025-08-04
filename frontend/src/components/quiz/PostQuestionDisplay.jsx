import React from 'react';
import ExplanationDisplay from './ExplanationDisplay';
import IntermediateScoreboard from '../IntermediateScoreboard';
import './PostQuestionDisplay.css';

const PostQuestionDisplay = ({ 
  explanation,
  leaderboard,
  showExplanation = true,
  showLeaderboard = true,
  explanationDuration = 10000,
  onComplete,
  gameSettings = {}
}) => {
  const [explanationVisible, setExplanationVisible] = React.useState(showExplanation);
  const [currentView, setCurrentView] = React.useState(
    showExplanation && showLeaderboard ? 'split' : 
    showExplanation ? 'explanation' : 'leaderboard'
  );

  const handleExplanationClose = () => {
    if (showLeaderboard && currentView === 'split') {
      setCurrentView('leaderboard');
      setExplanationVisible(false);
      // Continue showing leaderboard for remaining time
      setTimeout(() => {
        onComplete?.();
      }, Math.max(2000, explanationDuration * 0.3));
    } else {
      onComplete?.();
    }
  };

  const renderSplitView = () => (
    <div className="post-question-split">
      <div className="split-explanation">
        <ExplanationDisplay
          explanation={explanation}
          isVisible={explanationVisible}
          duration={explanationDuration}
          onClose={handleExplanationClose}
          showTimer={true}
          autoClose={true}
        />
      </div>
      <div className="split-leaderboard">
        <div className="leaderboard-wrapper">
          <IntermediateScoreboard 
            leaderboard={leaderboard}
            gameSettings={gameSettings}
            compact={true}
          />
        </div>
      </div>
    </div>
  );

  const renderExplanationOnly = () => (
    <ExplanationDisplay
      explanation={explanation}
      isVisible={true}
      duration={explanationDuration}
      onClose={onComplete}
      showTimer={true}
      autoClose={true}
    />
  );

  const renderLeaderboardOnly = () => (
    <div className="post-question-leaderboard-only">
      <IntermediateScoreboard 
        leaderboard={leaderboard}
        gameSettings={gameSettings}
        compact={false}
      />
    </div>
  );

  // Don't render anything if neither explanation nor leaderboard should be shown
  if (!showExplanation && !showLeaderboard) {
    React.useEffect(() => {
      onComplete?.();
    }, [onComplete]);
    return null;
  }

  switch (currentView) {
    case 'split':
      return renderSplitView();
    case 'explanation':
      return renderExplanationOnly();
    case 'leaderboard':
      return renderLeaderboardOnly();
    default:
      return null;
  }
};

export default PostQuestionDisplay;
