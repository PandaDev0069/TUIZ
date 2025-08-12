import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaClock,
  FaUsers,
  FaEye,
  FaBolt,
  FaTrophy,
  FaHeart,
  FaFire,
  FaTarget,
  FaExpand,
  FaCompress,
  FaSyncAlt,
  FaDownload,
  FaPlay,
  FaPause,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import './LiveAnalytics.css';

/**
 * LiveAnalytics - Real-time Analytics Dashboard
 * Phase 4: Advanced Analytics & Insights Implementation
 * 
 * Features:
 * - Live answer distribution analysis
 * - Real-time engagement metrics
 * - Performance tracking with leaderboard evolution
 * - Interactive charts and heat maps
 * - Question analytics with difficulty assessment
 * - Participation monitoring
 */
function LiveAnalytics({ 
  gameState, 
  players = [], 
  currentQuestion, 
  questionHistory = [],
  onQuestionJump,
  onPlayerFocus,
  className = '' 
}) {
  // Core component state
  const [activeTab, setActiveTab] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [timeRange, setTimeRange] = useState('current'); // current, last5, last10, all
  const [selectedMetric, setSelectedMetric] = useState('engagement');

  // Analytics data state
  const [liveData, setLiveData] = useState({
    responseDistribution: {},
    engagementMetrics: {
      participationRate: 0,
      attentionScore: 0,
      responseSpeed: 0,
      accuracyRate: 0
    },
    performanceData: {
      leaderboard: [],
      scoreProgression: [],
      achievements: []
    },
    questionAnalytics: {
      difficulty: 'medium',
      averageTime: 0,
      confidenceLevel: 0,
      dropoffRate: 0
    }
  });

  // Chart and visualization refs
  const chartContainer = useRef(null);
  const heatmapContainer = useRef(null);
  const refreshTimer = useRef(null);

  // Initialize component
  useEffect(() => {
    if (isAutoRefresh) {
      refreshTimer.current = setInterval(() => {
        updateLiveData();
      }, refreshInterval);
    }

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [isAutoRefresh, refreshInterval, gameState.id]);

  // Update analytics data
  const updateLiveData = () => {
    if (!gameState?.id || !currentQuestion) return;

    // Simulate real-time data updates
    const mockResponseDistribution = generateResponseDistribution();
    const mockEngagementMetrics = calculateEngagementMetrics();
    const mockPerformanceData = generatePerformanceData();
    const mockQuestionAnalytics = analyzeCurrentQuestion();

    setLiveData({
      responseDistribution: mockResponseDistribution,
      engagementMetrics: mockEngagementMetrics,
      performanceData: mockPerformanceData,
      questionAnalytics: mockQuestionAnalytics
    });
  };

  // Generate mock response distribution
  const generateResponseDistribution = () => {
    if (!currentQuestion?.options) return {};
    
    const total = players.length;
    const distribution = {};
    
    currentQuestion.options.forEach((option, index) => {
      const percentage = Math.random() * 60 + 10; // 10-70%
      distribution[index] = {
        option: option,
        count: Math.floor(total * (percentage / 100)),
        percentage: percentage,
        isCorrect: index === currentQuestion.correctAnswer
      };
    });

    return distribution;
  };

  // Calculate engagement metrics
  const calculateEngagementMetrics = () => {
    const participationRate = players.length > 0 ? 
      (players.filter(p => p.hasAnswered).length / players.length) * 100 : 0;
    
    const avgResponseTime = players.length > 0 ?
      players.reduce((sum, p) => sum + (p.responseTime || 0), 0) / players.length : 0;

    const attentionScore = Math.random() * 40 + 60; // 60-100%
    const accuracyRate = Math.random() * 30 + 60; // 60-90%

    return {
      participationRate: Math.round(participationRate),
      attentionScore: Math.round(attentionScore),
      responseSpeed: Math.round(10 - Math.min(avgResponseTime / 1000, 10)), // 0-10 scale
      accuracyRate: Math.round(accuracyRate)
    };
  };

  // Generate performance data
  const generatePerformanceData = () => {
    const sortedPlayers = [...players]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    const scoreProgression = sortedPlayers.map(player => ({
      playerId: player.id,
      playerName: player.name,
      scores: Array.from({ length: 5 }, (_, i) => Math.random() * 1000)
    }));

    const achievements = [
      { type: 'speed', player: sortedPlayers[0]?.name, value: '2.3s' },
      { type: 'streak', player: sortedPlayers[1]?.name, value: '5' },
      { type: 'participation', player: sortedPlayers[2]?.name, value: '100%' }
    ];

    return {
      leaderboard: sortedPlayers,
      scoreProgression,
      achievements
    };
  };

  // Analyze current question
  const analyzeCurrentQuestion = () => {
    const avgTime = players.length > 0 ?
      players.reduce((sum, p) => sum + (p.responseTime || 0), 0) / players.length : 0;

    const confidenceLevel = avgTime < 5000 ? 'high' : avgTime < 10000 ? 'medium' : 'low';
    const difficulty = avgTime < 3000 ? 'easy' : avgTime < 8000 ? 'medium' : 'hard';
    const dropoffRate = Math.random() * 20; // 0-20%

    return {
      difficulty,
      averageTime: avgTime,
      confidenceLevel,
      dropoffRate: Math.round(dropoffRate)
    };
  };

  // Event handlers
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleAutoRefreshToggle = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  const handleManualRefresh = () => {
    updateLiveData();
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    updateLiveData();
  };

  const handleExportData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      gameState,
      liveData,
      players: players.map(p => ({
        name: p.name,
        score: p.score,
        responseTime: p.responseTime
      }))
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Utility functions
  const formatPercentage = (value) => `${Math.round(value || 0)}%`;
  const formatTime = (ms) => `${(ms / 1000).toFixed(1)}s`;
  const formatScore = (score) => (score || 0).toLocaleString();

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'danger';
      default: return 'info';
    }
  };

  const getEngagementColor = (value) => {
    if (value >= 80) return 'success';
    if (value >= 60) return 'warning';
    return 'danger';
  };

  const getTrendIcon = (current, previous) => {
    if (current > previous) return <FaArrowUp className="trend-up" />;
    if (current < previous) return <FaArrowDown className="trend-down" />;
    return <FaEquals className="trend-stable" />;
  };

  // Early return if no game data
  if (!gameState?.id || !currentQuestion) {
    return (
      <div className={`live-analytics live-analytics--loading ${className}`}>
        <div className="live-analytics__loading">
          <div className="loading-spinner"></div>
          <p>分析データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`live-analytics ${isFullscreen ? 'live-analytics--fullscreen' : ''} ${className}`}>
      {/* Header with controls */}
      <div className="live-analytics__header">
        <div className="live-analytics__header-left">
          <h2 className="live-analytics__title">
            <FaChartLine className="live-analytics__title-icon" />
            ライブ分析
          </h2>
          <div className="live-analytics__status">
            <div className={`status-indicator ${isAutoRefresh ? 'status-indicator--active' : 'status-indicator--paused'}`}>
              {isAutoRefresh ? <FaPlay /> : <FaPause />}
              <span>{isAutoRefresh ? 'リアルタイム更新中' : '更新一時停止'}</span>
            </div>
          </div>
        </div>

        <div className="live-analytics__header-right">
          <div className="live-analytics__controls">
            <select 
              className="time-range-select"
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
            >
              <option value="current">現在の問題</option>
              <option value="last5">直近5問</option>
              <option value="last10">直近10問</option>
              <option value="all">全ての問題</option>
            </select>

            <button 
              className="control-btn control-btn--refresh"
              onClick={handleManualRefresh}
              title="手動更新"
            >
              <FaSyncAlt />
            </button>

            <button 
              className={`control-btn control-btn--auto ${isAutoRefresh ? 'control-btn--active' : ''}`}
              onClick={handleAutoRefreshToggle}
              title="自動更新切り替え"
            >
              {isAutoRefresh ? <FaPause /> : <FaPlay />}
            </button>

            <button 
              className="control-btn control-btn--export"
              onClick={handleExportData}
              title="データエクスポート"
            >
              <FaDownload />
            </button>

            <button 
              className="control-btn control-btn--fullscreen"
              onClick={handleFullscreenToggle}
              title="全画面表示"
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="live-analytics__tabs">
        <button 
          className={`analytics-tab ${activeTab === 'overview' ? 'analytics-tab--active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <FaChartBar className="analytics-tab__icon" />
          <span>概要</span>
        </button>

        <button 
          className={`analytics-tab ${activeTab === 'answers' ? 'analytics-tab--active' : ''}`}
          onClick={() => handleTabChange('answers')}
        >
          <FaChartPie className="analytics-tab__icon" />
          <span>回答分析</span>
        </button>

        <button 
          className={`analytics-tab ${activeTab === 'engagement' ? 'analytics-tab--active' : ''}`}
          onClick={() => handleTabChange('engagement')}
        >
          <FaBolt className="analytics-tab__icon" />
          <span>エンゲージメント</span>
        </button>

        <button 
          className={`analytics-tab ${activeTab === 'performance' ? 'analytics-tab--active' : ''}`}
          onClick={() => handleTabChange('performance')}
        >
          <FaTrophy className="analytics-tab__icon" />
          <span>パフォーマンス</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="live-analytics__content">
        {activeTab === 'overview' && (
          <div className="analytics-overview">
            {/* Quick Metrics Grid */}
            <div className="quick-metrics">
              <div className="metric-card metric-card--participation">
                <div className="metric-card__icon">
                  <FaUsers className="metric-icon metric-icon--primary" />
                </div>
                <div className="metric-card__content">
                  <div className="metric-card__value">
                    {formatPercentage(liveData.engagementMetrics.participationRate)}
                  </div>
                  <div className="metric-card__label">参加率</div>
                  <div className="metric-card__trend">
                    {getTrendIcon(liveData.engagementMetrics.participationRate, 75)}
                    <span className="metric-card__players">
                      {players.filter(p => p.hasAnswered).length} / {players.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-card metric-card--attention">
                <div className="metric-card__icon">
                  <FaEye className="metric-icon metric-icon--info" />
                </div>
                <div className="metric-card__content">
                  <div className="metric-card__value">
                    {formatPercentage(liveData.engagementMetrics.attentionScore)}
                  </div>
                  <div className="metric-card__label">注意力スコア</div>
                  <div className="metric-card__trend">
                    <span className={`attention-level attention-level--${getEngagementColor(liveData.engagementMetrics.attentionScore)}`}>
                      {liveData.engagementMetrics.attentionScore >= 80 ? '高' : 
                       liveData.engagementMetrics.attentionScore >= 60 ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-card metric-card--speed">
                <div className="metric-card__icon">
                  <FaClock className="metric-icon metric-icon--warning" />
                </div>
                <div className="metric-card__content">
                  <div className="metric-card__value">
                    {formatTime(liveData.questionAnalytics.averageTime)}
                  </div>
                  <div className="metric-card__label">平均回答時間</div>
                  <div className="metric-card__trend">
                    <span className={`difficulty-badge difficulty-badge--${getDifficultyColor(liveData.questionAnalytics.difficulty)}`}>
                      {liveData.questionAnalytics.difficulty === 'easy' ? '易' :
                       liveData.questionAnalytics.difficulty === 'medium' ? '中' : '難'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-card metric-card--accuracy">
                <div className="metric-card__icon">
                  <FaTarget className="metric-icon metric-icon--success" />
                </div>
                <div className="metric-card__content">
                  <div className="metric-card__value">
                    {formatPercentage(liveData.engagementMetrics.accuracyRate)}
                  </div>
                  <div className="metric-card__label">正解率</div>
                  <div className="metric-card__trend">
                    <span className={`accuracy-indicator accuracy-indicator--${getEngagementColor(liveData.engagementMetrics.accuracyRate)}`}>
                      {liveData.engagementMetrics.accuracyRate >= 80 ? '優秀' : 
                       liveData.engagementMetrics.accuracyRate >= 60 ? '良好' : '要改善'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Question Info */}
            <div className="current-question-info">
              <div className="question-header">
                <h3 className="question-title">
                  <FaTarget className="question-icon" />
                  現在の問題: {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}
                </h3>
                <div className="question-meta">
                  <span className={`difficulty-tag difficulty-tag--${getDifficultyColor(liveData.questionAnalytics.difficulty)}`}>
                    難易度: {liveData.questionAnalytics.difficulty === 'easy' ? '易しい' :
                            liveData.questionAnalytics.difficulty === 'medium' ? '普通' : '難しい'}
                  </span>
                  <span className="question-timer">
                    残り時間: {Math.max(0, gameState.timeRemaining)}秒
                  </span>
                </div>
              </div>

              <div className="question-insights">
                <div className="insight-item">
                  <FaCheckCircle className="insight-icon insight-icon--success" />
                  <div className="insight-content">
                    <div className="insight-label">回答済み</div>
                    <div className="insight-value">
                      {players.filter(p => p.hasAnswered).length} 人
                    </div>
                  </div>
                </div>

                <div className="insight-item">
                  <FaClock className="insight-icon insight-icon--warning" />
                  <div className="insight-content">
                    <div className="insight-label">平均時間</div>
                    <div className="insight-value">
                      {formatTime(liveData.questionAnalytics.averageTime)}
                    </div>
                  </div>
                </div>

                <div className="insight-item">
                  <FaHeart className="insight-icon insight-icon--danger" />
                  <div className="insight-content">
                    <div className="insight-label">離脱率</div>
                    <div className="insight-value">
                      {formatPercentage(liveData.questionAnalytics.dropoffRate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Alerts */}
            <div className="realtime-alerts">
              <div className="alerts-header">
                <FaBolt className="alerts-icon" />
                <span className="alerts-title">リアルタイム通知</span>
              </div>
              
              <div className="alerts-list">
                {liveData.engagementMetrics.participationRate < 50 && (
                  <div className="alert alert--warning">
                    <FaExclamationTriangle className="alert-icon" />
                    <span className="alert-text">参加率が低下しています。時間延長を検討してください。</span>
                  </div>
                )}

                {liveData.questionAnalytics.dropoffRate > 15 && (
                  <div className="alert alert--danger">
                    <FaTimes className="alert-icon" />
                    <span className="alert-text">離脱率が高いです。問題の難易度を確認してください。</span>
                  </div>
                )}

                {liveData.engagementMetrics.attentionScore > 85 && (
                  <div className="alert alert--success">
                    <FaCheckCircle className="alert-icon" />
                    <span className="alert-text">高い集中力を維持中！素晴らしいエンゲージメントです。</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'answers' && (
          <div className="analytics-answers">
            <div className="answer-distribution">
              <div className="distribution-header">
                <h3 className="distribution-title">
                  <FaChartPie className="distribution-icon" />
                  回答分布
                </h3>
                <div className="distribution-summary">
                  回答数: {Object.values(liveData.responseDistribution).reduce((sum, option) => sum + option.count, 0)}
                </div>
              </div>

              <div className="distribution-chart">
                {Object.entries(liveData.responseDistribution).map(([index, option]) => (
                  <div key={index} className="distribution-bar">
                    <div className="bar-label">
                      <span className={`option-indicator ${option.isCorrect ? 'option-indicator--correct' : ''}`}>
                        {String.fromCharCode(65 + parseInt(index))}
                      </span>
                      <span className="option-text">{option.option}</span>
                      {option.isCorrect && <FaCheckCircle className="correct-icon" />}
                    </div>
                    <div className="bar-container">
                      <div 
                        className={`bar-fill ${option.isCorrect ? 'bar-fill--correct' : 'bar-fill--option'}`}
                        style={{ width: `${option.percentage}%` }}
                      />
                      <div className="bar-overlay">
                        <span className="bar-count">{option.count}人</span>
                        <span className="bar-percentage">{formatPercentage(option.percentage)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer Heat Map */}
            <div className="answer-heatmap" ref={heatmapContainer}>
              <div className="heatmap-header">
                <h3 className="heatmap-title">
                  <FaFire className="heatmap-icon" />
                  回答ヒートマップ
                </h3>
                <div className="heatmap-legend">
                  <span className="legend-item">
                    <div className="legend-color legend-color--low"></div>
                    <span>低</span>
                  </span>
                  <span className="legend-item">
                    <div className="legend-color legend-color--medium"></div>
                    <span>中</span>
                  </span>
                  <span className="legend-item">
                    <div className="legend-color legend-color--high"></div>
                    <span>高</span>
                  </span>
                </div>
              </div>

              <div className="heatmap-grid">
                {Array.from({ length: 20 }, (_, i) => (
                  <div 
                    key={i} 
                    className={`heatmap-cell heatmap-cell--${['low', 'medium', 'high'][Math.floor(Math.random() * 3)]}`}
                    title={`プレイヤー ${i + 1}: ${Math.random() > 0.5 ? '正解' : '不正解'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'engagement' && (
          <div className="analytics-engagement">
            <div className="engagement-overview">
              <div className="engagement-metrics">
                <div className="engagement-metric">
                  <div className="metric-header">
                    <FaUsers className="metric-header-icon" />
                    <span className="metric-header-title">参加度</span>
                  </div>
                  <div className="metric-visualization">
                    <div className="metric-bar">
                      <div 
                        className="metric-bar-fill metric-bar-fill--participation"
                        style={{ width: `${liveData.engagementMetrics.participationRate}%` }}
                      />
                    </div>
                    <div className="metric-value">
                      {formatPercentage(liveData.engagementMetrics.participationRate)}
                    </div>
                  </div>
                </div>

                <div className="engagement-metric">
                  <div className="metric-header">
                    <FaEye className="metric-header-icon" />
                    <span className="metric-header-title">注意力</span>
                  </div>
                  <div className="metric-visualization">
                    <div className="metric-bar">
                      <div 
                        className="metric-bar-fill metric-bar-fill--attention"
                        style={{ width: `${liveData.engagementMetrics.attentionScore}%` }}
                      />
                    </div>
                    <div className="metric-value">
                      {formatPercentage(liveData.engagementMetrics.attentionScore)}
                    </div>
                  </div>
                </div>

                <div className="engagement-metric">
                  <div className="metric-header">
                    <FaBolt className="metric-header-icon" />
                    <span className="metric-header-title">反応速度</span>
                  </div>
                  <div className="metric-visualization">
                    <div className="metric-bar">
                      <div 
                        className="metric-bar-fill metric-bar-fill--speed"
                        style={{ width: `${liveData.engagementMetrics.responseSpeed * 10}%` }}
                      />
                    </div>
                    <div className="metric-value">
                      {liveData.engagementMetrics.responseSpeed}/10
                    </div>
                  </div>
                </div>
              </div>

              <div className="engagement-insights">
                <h4 className="insights-title">
                  <FaFire className="insights-icon" />
                  エンゲージメント洞察
                </h4>
                
                <div className="insights-list">
                  <div className="insight-card">
                    <div className="insight-card-header">
                      <FaHeart className="insight-card-icon insight-card-icon--positive" />
                      <span className="insight-card-title">ピーク時間帯</span>
                    </div>
                    <div className="insight-card-content">
                      問題開始から30秒後に最も高いエンゲージメントを記録
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-card-header">
                      <FaTarget className="insight-card-icon insight-card-icon--info" />
                      <span className="insight-card-title">参加パターン</span>
                    </div>
                    <div className="insight-card-content">
                      85%のプレイヤーが一貫して参加を維持
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-card-header">
                      <FaBolt className="insight-card-icon insight-card-icon--warning" />
                      <span className="insight-card-title">改善提案</span>
                    </div>
                    <div className="insight-card-content">
                      制限時間を10秒延長することで参加率向上が期待できます
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="analytics-performance">
            <div className="performance-overview">
              {/* Live Leaderboard */}
              <div className="live-leaderboard">
                <div className="leaderboard-header">
                  <h3 className="leaderboard-title">
                    <FaTrophy className="leaderboard-icon" />
                    ライブリーダーボード
                  </h3>
                  <div className="leaderboard-meta">
                    上位 {Math.min(liveData.performanceData.leaderboard.length, 10)} プレイヤー
                  </div>
                </div>

                <div className="leaderboard-list">
                  {liveData.performanceData.leaderboard.slice(0, 10).map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`leaderboard-item ${index < 3 ? `leaderboard-item--rank-${index + 1}` : ''}`}
                      onClick={() => onPlayerFocus && onPlayerFocus(player.id)}
                    >
                      <div className="leaderboard-rank">
                        {index < 3 ? (
                          <FaTrophy className={`trophy trophy--rank-${index + 1}`} />
                        ) : (
                          <span className="rank-number">{index + 1}</span>
                        )}
                      </div>
                      <div className="leaderboard-player">
                        <div className="player-name">{player.name}</div>
                        <div className="player-meta">
                          {player.responseTime && `平均 ${formatTime(player.responseTime)}`}
                        </div>
                      </div>
                      <div className="leaderboard-score">
                        <div className="score-value">{formatScore(player.score)}</div>
                        <div className="score-change">
                          {getTrendIcon(player.score, player.previousScore || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="recent-achievements">
                <div className="achievements-header">
                  <h3 className="achievements-title">
                    <FaCheckCircle className="achievements-icon" />
                    最近の実績
                  </h3>
                </div>

                <div className="achievements-list">
                  {liveData.performanceData.achievements.map((achievement, index) => (
                    <div key={index} className="achievement-item">
                      <div className={`achievement-icon achievement-icon--${achievement.type}`}>
                        {achievement.type === 'speed' && <FaBolt />}
                        {achievement.type === 'streak' && <FaFire />}
                        {achievement.type === 'participation' && <FaHeart />}
                      </div>
                      <div className="achievement-content">
                        <div className="achievement-player">{achievement.player}</div>
                        <div className="achievement-desc">
                          {achievement.type === 'speed' && `最速回答: ${achievement.value}`}
                          {achievement.type === 'streak' && `連続正解: ${achievement.value}問`}
                          {achievement.type === 'participation' && `参加率: ${achievement.value}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

LiveAnalytics.propTypes = {
  gameState: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    currentQuestionIndex: PropTypes.number.isRequired,
    totalQuestions: PropTypes.number.isRequired,
    timeRemaining: PropTypes.number.isRequired
  }).isRequired,
  players: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    score: PropTypes.number,
    hasAnswered: PropTypes.bool,
    responseTime: PropTypes.number
  })),
  currentQuestion: PropTypes.shape({
    id: PropTypes.string,
    text: PropTypes.string,
    options: PropTypes.array,
    correctAnswer: PropTypes.number
  }),
  questionHistory: PropTypes.array,
  onQuestionJump: PropTypes.func,
  onPlayerFocus: PropTypes.func,
  className: PropTypes.string
};

export default LiveAnalytics;
