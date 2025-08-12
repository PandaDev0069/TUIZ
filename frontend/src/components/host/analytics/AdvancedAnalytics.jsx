/* AdvancedAnalytics.jsx - Advanced Analytics Dashboard */
/* Phase 3: Advanced Analytics & Reporting */

import React, { useState, useEffect } from 'react';
import { 
  FaChartBar, FaChartLine, FaChartPie, FaTrophy,
  FaClock, FaUsers, FaBullseye, FaCalendarAlt,
  FaDownload, FaFilter, FaSync, FaEye, FaHeart,
  FaBolt, FaStar, FaAward, FaFire, FaTarget,
  FaPercent, FaStopwatch, FaUserCheck, FaChevronDown
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import './AdvancedAnalytics.css';

const AdvancedAnalytics = ({ 
  gameData, 
  playerData, 
  questionData, 
  timeRange = '7d',
  onExport,
  refreshData
}) => {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isLoading, setIsLoading] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [filterBy, setFilterBy] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    engagement: false,
    performance: false,
    temporal: false
  });

  // Sample analytics data (would come from props/API in real implementation)
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalGames: 0,
      totalPlayers: 0,
      averageScore: 0,
      completionRate: 0,
      averageGameTime: 0,
      topCategory: 'General Knowledge'
    },
    engagement: {
      averageSessionTime: 0,
      returnPlayerRate: 0,
      peakConcurrentPlayers: 0,
      chatMessages: 0,
      questionsAnswered: 0,
      streaksAchieved: 0
    },
    performance: {
      accuracyTrend: [],
      speedTrend: [],
      categoryPerformance: [],
      difficultyBreakdown: [],
      playerRankings: []
    },
    temporal: {
      hourlyActivity: [],
      dailyActivity: [],
      weeklyTrends: [],
      seasonalPatterns: []
    }
  });

  useEffect(() => {
    updateAnalyticsData();
  }, [gameData, playerData, questionData, selectedTimeRange]);

  const updateAnalyticsData = () => {
    if (!gameData || !playerData) return;

    // Calculate overview metrics
    const totalGames = gameData.length || 0;
    const totalPlayers = playerData.length || 0;
    const averageScore = playerData.reduce((sum, p) => sum + (p.score || 0), 0) / totalPlayers || 0;
    const completedGames = gameData.filter(g => g.status === 'completed').length;
    const completionRate = totalGames > 0 ? (completedGames / totalGames) * 100 : 0;
    
    // Calculate engagement metrics
    const totalSessionTime = playerData.reduce((sum, p) => sum + (p.sessionTime || 0), 0);
    const averageSessionTime = totalPlayers > 0 ? totalSessionTime / totalPlayers : 0;
    const returnPlayers = playerData.filter(p => p.gamesPlayed > 1).length;
    const returnPlayerRate = totalPlayers > 0 ? (returnPlayers / totalPlayers) * 100 : 0;

    // Generate mock performance data
    const categoryPerformance = [
      { category: 'General Knowledge', accuracy: 78, attempts: 245 },
      { category: 'Science', accuracy: 65, attempts: 189 },
      { category: 'History', accuracy: 72, attempts: 156 },
      { category: 'Sports', accuracy: 81, attempts: 134 },
      { category: 'Entertainment', accuracy: 85, attempts: 167 }
    ];

    const accuracyTrend = Array.from({ length: 7 }, (_, i) => ({
      day: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      accuracy: 70 + Math.random() * 20
    }));

    setAnalyticsData({
      overview: {
        totalGames,
        totalPlayers,
        averageScore: Math.round(averageScore),
        completionRate: Math.round(completionRate),
        averageGameTime: Math.round(averageSessionTime / 60), // minutes
        topCategory: 'Entertainment'
      },
      engagement: {
        averageSessionTime: Math.round(averageSessionTime / 60),
        returnPlayerRate: Math.round(returnPlayerRate),
        peakConcurrentPlayers: Math.max(...playerData.map(p => p.id ? 1 : 0)) || 0,
        chatMessages: Math.floor(Math.random() * 500) + 100,
        questionsAnswered: playerData.reduce((sum, p) => sum + (p.correctAnswers || 0) + (p.incorrectAnswers || 0), 0),
        streaksAchieved: Math.floor(Math.random() * 50) + 10
      },
      performance: {
        accuracyTrend,
        categoryPerformance,
        difficultyBreakdown: [
          { difficulty: 'Easy', correct: 89, total: 120 },
          { difficulty: 'Medium', correct: 67, total: 95 },
          { difficulty: 'Hard', correct: 23, total: 45 }
        ],
        playerRankings: playerData
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 10)
          .map((player, index) => ({
            rank: index + 1,
            name: player.name,
            score: player.score || 0,
            accuracy: Math.round(((player.correctAnswers || 0) / ((player.correctAnswers || 0) + (player.incorrectAnswers || 0))) * 100) || 0
          }))
      },
      temporal: {
        hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          players: Math.floor(Math.random() * 20) + 5
        })),
        dailyActivity: Array.from({ length: 7 }, (_, i) => ({
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          games: Math.floor(Math.random() * 15) + 5,
          players: Math.floor(Math.random() * 50) + 20
        }))
      }
    });
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshData?.();
      updateAnalyticsData();
    } catch (error) {
      console.error('Failed to refresh analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format = 'csv') => {
    onExport?.(analyticsData, format);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderMetricCard = (title, value, icon, change, format = '') => (
    <div className="metric-card">
      <div className="metric-card__header">
        <div className="metric-card__icon">
          {icon}
        </div>
        <h4 className="metric-card__title">{title}</h4>
      </div>
      <div className="metric-card__value">
        {typeof value === 'number' ? value.toLocaleString() : value}{format}
      </div>
      {change && (
        <div className={`metric-card__change ${change > 0 ? 'metric-card__change--positive' : 'metric-card__change--negative'}`}>
          {change > 0 ? '+' : ''}{change}% from last period
        </div>
      )}
    </div>
  );

  const renderBarChart = (data, xKey, yKey, title) => (
    <div className="chart-container">
      <h4 className="chart-title">{title}</h4>
      <div className="bar-chart">
        {data.map((item, index) => (
          <div key={index} className="bar-chart__item">
            <div 
              className="bar-chart__bar"
              style={{ 
                height: `${(item[yKey] / Math.max(...data.map(d => d[yKey]))) * 100}%` 
              }}
              title={`${item[xKey]}: ${item[yKey]}`}
            />
            <div className="bar-chart__label">{item[xKey]}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLineChart = (data, xKey, yKey, title) => (
    <div className="chart-container">
      <h4 className="chart-title">{title}</h4>
      <div className="line-chart">
        <svg width="100%" height="200" viewBox="0 0 400 200">
          <polyline
            points={data.map((item, index) => 
              `${(index / (data.length - 1)) * 380 + 10},${190 - (item[yKey] / Math.max(...data.map(d => d[yKey]))) * 170}`
            ).join(' ')}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
          />
          {data.map((item, index) => (
            <circle
              key={index}
              cx={(index / (data.length - 1)) * 380 + 10}
              cy={190 - (item[yKey] / Math.max(...data.map(d => d[yKey]))) * 170}
              r="4"
              fill="var(--color-accent)"
              title={`${item[xKey]}: ${item[yKey]}`}
            />
          ))}
        </svg>
        <div className="line-chart__labels">
          {data.map((item, index) => (
            <span key={index} className="line-chart__label">
              {item[xKey]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="advanced-analytics">
      <div className="analytics-header">
        <div className="analytics-header__title">
          <h2>
            <FaChartBar className="analytics-icon" />
            Advanced Analytics Dashboard
          </h2>
          <p>Comprehensive insights into game performance and player engagement</p>
        </div>

        <div className="analytics-controls">
          <select 
            className="analytics-select"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
          </select>

          <select 
            className="analytics-select"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
          >
            <option value="all">All Games</option>
            <option value="completed">Completed Only</option>
            <option value="active">Active Games</option>
          </select>

          <button 
            className="analytics-btn analytics-btn--secondary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <FaSync className={`analytics-btn__icon ${isLoading ? 'spinning' : ''}`} />
            Refresh
          </button>

          <button 
            className="analytics-btn analytics-btn--primary"
            onClick={() => handleExport('csv')}
          >
            <FaDownload className="analytics-btn__icon" />
            Export
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="analytics-section">
        <div 
          className="analytics-section__header"
          onClick={() => toggleSection('overview')}
        >
          <h3>
            <FaEye className="section-icon" />
            Overview Metrics
          </h3>
          <FaChevronDown className={`chevron ${expandedSections.overview ? 'chevron--expanded' : ''}`} />
        </div>

        {expandedSections.overview && (
          <div className="analytics-section__content">
            <div className="metrics-grid">
              {renderMetricCard('Total Games', analyticsData.overview.totalGames, <FaTrophy />, 12)}
              {renderMetricCard('Total Players', analyticsData.overview.totalPlayers, <FaUsers />, 8)}
              {renderMetricCard('Average Score', analyticsData.overview.averageScore, <FaStar />, 5)}
              {renderMetricCard('Completion Rate', analyticsData.overview.completionRate, <FaPercent />, 3, '%')}
              {renderMetricCard('Avg Game Time', analyticsData.overview.averageGameTime, <FaStopwatch />, -2, 'm')}
              {renderMetricCard('Top Category', analyticsData.overview.topCategory, <FaAward />, null)}
            </div>
          </div>
        )}
      </div>

      {/* Engagement Analytics */}
      <div className="analytics-section">
        <div 
          className="analytics-section__header"
          onClick={() => toggleSection('engagement')}
        >
          <h3>
            <FaHeart className="section-icon" />
            Player Engagement
          </h3>
          <FaChevronDown className={`chevron ${expandedSections.engagement ? 'chevron--expanded' : ''}`} />
        </div>

        {expandedSections.engagement && (
          <div className="analytics-section__content">
            <div className="metrics-grid">
              {renderMetricCard('Avg Session Time', analyticsData.engagement.averageSessionTime, <FaClock />, 15, 'm')}
              {renderMetricCard('Return Player Rate', analyticsData.engagement.returnPlayerRate, <FaUserCheck />, 7, '%')}
              {renderMetricCard('Peak Concurrent', analyticsData.engagement.peakConcurrentPlayers, <FaBolt />, 23)}
              {renderMetricCard('Chat Messages', analyticsData.engagement.chatMessages, <FaHeart />, 34)}
              {renderMetricCard('Questions Answered', analyticsData.engagement.questionsAnswered, <FaTarget />, 18)}
              {renderMetricCard('Streaks Achieved', analyticsData.engagement.streaksAchieved, <FaFire />, 42)}
            </div>
          </div>
        )}
      </div>

      {/* Performance Analytics */}
      <div className="analytics-section">
        <div 
          className="analytics-section__header"
          onClick={() => toggleSection('performance')}
        >
          <h3>
            <FaBullseye className="section-icon" />
            Performance Analysis
          </h3>
          <FaChevronDown className={`chevron ${expandedSections.performance ? 'chevron--expanded' : ''}`} />
        </div>

        {expandedSections.performance && (
          <div className="analytics-section__content">
            <div className="charts-grid">
              {renderLineChart(
                analyticsData.performance.accuracyTrend, 
                'day', 
                'accuracy', 
                'Accuracy Trend (7 Days)'
              )}
              
              {renderBarChart(
                analyticsData.performance.categoryPerformance, 
                'category', 
                'accuracy', 
                'Category Performance'
              )}
            </div>

            <div className="performance-tables">
              <div className="performance-table">
                <h4>Difficulty Breakdown</h4>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Difficulty</th>
                      <th>Correct</th>
                      <th>Total</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.performance.difficultyBreakdown.map((diff, index) => (
                      <tr key={index}>
                        <td>{diff.difficulty}</td>
                        <td>{diff.correct}</td>
                        <td>{diff.total}</td>
                        <td>{Math.round((diff.correct / diff.total) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="performance-table">
                <h4>Top Players</h4>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.performance.playerRankings.map((player, index) => (
                      <tr key={index}>
                        <td>#{player.rank}</td>
                        <td>{player.name}</td>
                        <td>{player.score}</td>
                        <td>{player.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Temporal Analysis */}
      <div className="analytics-section">
        <div 
          className="analytics-section__header"
          onClick={() => toggleSection('temporal')}
        >
          <h3>
            <FaCalendarAlt className="section-icon" />
            Temporal Analysis
          </h3>
          <FaChevronDown className={`chevron ${expandedSections.temporal ? 'chevron--expanded' : ''}`} />
        </div>

        {expandedSections.temporal && (
          <div className="analytics-section__content">
            <div className="charts-grid">
              {renderBarChart(
                analyticsData.temporal.hourlyActivity, 
                'hour', 
                'players', 
                'Hourly Player Activity'
              )}
              
              {renderBarChart(
                analyticsData.temporal.dailyActivity, 
                'day', 
                'games', 
                'Daily Game Activity'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

AdvancedAnalytics.propTypes = {
  gameData: PropTypes.array,
  playerData: PropTypes.array,
  questionData: PropTypes.array,
  timeRange: PropTypes.string,
  onExport: PropTypes.func,
  refreshData: PropTypes.func
};

export default AdvancedAnalytics;
