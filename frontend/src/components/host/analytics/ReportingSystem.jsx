/* ReportingSystem.jsx - Advanced Reporting System */
/* Phase 3: Advanced Analytics & Reporting */

import React, { useState, useEffect } from 'react';
import { 
  FaFileAlt, FaCalendarAlt, FaDownload, FaFilter,
  FaChartBar, FaTable, FaFileExport, FaCog,
  FaEye, FaPrint, FaShare, FaBookmark,
  FaClock, FaUser, FaTrophy, FaQuestionCircle,
  FaExclamationCircle, FaCheckCircle, FaTimesCircle,
  FaPlus, FaEdit, FaTrash, FaSave, FaSpinner
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import './ReportingSystem.css';

const ReportingSystem = ({
  gameData = [],
  playerData = [],
  questionData = [],
  onGenerateReport,
  onSaveReport,
  onExportReport
}) => {
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    gameStatus: 'all',
    playerCount: 'all',
    category: 'all',
    difficulty: 'all'
  });
  const [savedReports, setSavedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportName, setReportName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Report templates
  const reportTemplates = {
    summary: {
      name: 'Game Summary Report',
      description: 'Overview of game performance and player engagement',
      icon: <FaChartBar />,
      sections: ['overview', 'player_stats', 'question_analysis']
    },
    detailed: {
      name: 'Detailed Analytics Report',
      description: 'Comprehensive analysis with charts and tables',
      icon: <FaTable />,
      sections: ['overview', 'player_stats', 'question_analysis', 'temporal_analysis', 'engagement_metrics']
    },
    player_performance: {
      name: 'Player Performance Report',
      description: 'Focus on individual player statistics and rankings',
      icon: <FaTrophy />,
      sections: ['player_rankings', 'player_detailed', 'streaks_achievements']
    },
    question_analytics: {
      name: 'Question Analytics Report',
      description: 'Analysis of question difficulty and effectiveness',
      icon: <FaQuestionCircle />,
      sections: ['question_stats', 'difficulty_analysis', 'category_performance']
    },
    custom: {
      name: 'Custom Report',
      description: 'Build your own report with selected metrics',
      icon: <FaCog />,
      sections: []
    }
  };

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = () => {
    // In real implementation, this would load from backend/storage
    const saved = localStorage.getItem('tuiz_saved_reports');
    if (saved) {
      setSavedReports(JSON.parse(saved));
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const template = reportTemplates[reportType];
      const filteredData = filterData();
      
      const report = {
        id: Date.now().toString(),
        name: reportName || `${template.name} - ${new Date().toLocaleDateString()}`,
        type: reportType,
        dateRange,
        filters,
        generatedAt: new Date().toISOString(),
        data: await processReportData(filteredData, template.sections)
      };

      setReportData(report);
      onGenerateReport?.(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const filterData = () => {
    let filteredGames = gameData.filter(game => {
      const gameDate = new Date(game.createdAt || game.startTime);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      if (gameDate < startDate || gameDate > endDate) return false;
      if (filters.gameStatus !== 'all' && game.status !== filters.gameStatus) return false;
      if (filters.category !== 'all' && game.category !== filters.category) return false;
      
      return true;
    });

    let filteredPlayers = playerData.filter(player => {
      const gameIds = filteredGames.map(g => g.id);
      return gameIds.includes(player.gameId);
    });

    let filteredQuestions = questionData.filter(question => {
      if (filters.category !== 'all' && question.category !== filters.category) return false;
      if (filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) return false;
      return true;
    });

    return {
      games: filteredGames,
      players: filteredPlayers,
      questions: filteredQuestions
    };
  };

  const processReportData = async (data, sections) => {
    const reportSections = {};

    if (sections.includes('overview')) {
      reportSections.overview = {
        totalGames: data.games.length,
        totalPlayers: data.players.length,
        averagePlayersPerGame: data.games.length > 0 ? data.players.length / data.games.length : 0,
        completionRate: calculateCompletionRate(data.games),
        averageScore: calculateAverageScore(data.players),
        totalQuestionsAnswered: data.players.reduce((sum, p) => sum + (p.questionsAnswered || 0), 0)
      };
    }

    if (sections.includes('player_stats')) {
      reportSections.playerStats = {
        topPlayers: getTopPlayers(data.players, 10),
        averageSessionTime: calculateAverageSessionTime(data.players),
        playerRetention: calculatePlayerRetention(data.players),
        engagementMetrics: calculateEngagementMetrics(data.players)
      };
    }

    if (sections.includes('question_analysis')) {
      reportSections.questionAnalysis = {
        questionStats: analyzeQuestions(data.questions, data.players),
        difficultyDistribution: analyzeDifficulty(data.questions),
        categoryPerformance: analyzeCategoryPerformance(data.questions, data.players)
      };
    }

    if (sections.includes('temporal_analysis')) {
      reportSections.temporalAnalysis = {
        dailyActivity: generateDailyActivity(data.games),
        hourlyDistribution: generateHourlyDistribution(data.games),
        weeklyTrends: generateWeeklyTrends(data.games)
      };
    }

    if (sections.includes('player_rankings')) {
      reportSections.playerRankings = {
        overallRankings: getTopPlayers(data.players, 50),
        categoryRankings: getCategoryRankings(data.players),
        achievementStats: getAchievementStats(data.players)
      };
    }

    return reportSections;
  };

  const calculateCompletionRate = (games) => {
    const completed = games.filter(g => g.status === 'completed').length;
    return games.length > 0 ? (completed / games.length) * 100 : 0;
  };

  const calculateAverageScore = (players) => {
    const totalScore = players.reduce((sum, p) => sum + (p.score || 0), 0);
    return players.length > 0 ? totalScore / players.length : 0;
  };

  const calculateAverageSessionTime = (players) => {
    const totalTime = players.reduce((sum, p) => sum + (p.sessionTime || 0), 0);
    return players.length > 0 ? totalTime / players.length : 0;
  };

  const getTopPlayers = (players, limit) => {
    return players
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name,
        score: player.score || 0,
        accuracy: calculatePlayerAccuracy(player),
        gamesPlayed: player.gamesPlayed || 1
      }));
  };

  const calculatePlayerAccuracy = (player) => {
    const correct = player.correctAnswers || 0;
    const total = correct + (player.incorrectAnswers || 0);
    return total > 0 ? (correct / total) * 100 : 0;
  };

  const saveReport = () => {
    if (!reportData || !reportName.trim()) return;

    const updatedReport = {
      ...reportData,
      name: reportName,
      savedAt: new Date().toISOString()
    };

    const updatedSavedReports = [...savedReports, updatedReport];
    setSavedReports(updatedSavedReports);
    localStorage.setItem('tuiz_saved_reports', JSON.stringify(updatedSavedReports));
    
    setShowSaveDialog(false);
    setReportName('');
    onSaveReport?.(updatedReport);
  };

  const loadReport = (report) => {
    setSelectedReport(report);
    setReportData(report);
    setReportType(report.type);
    setDateRange(report.dateRange);
    setFilters(report.filters);
  };

  const deleteReport = (reportId) => {
    const updatedReports = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updatedReports);
    localStorage.setItem('tuiz_saved_reports', JSON.stringify(updatedReports));
  };

  const exportReport = (format = 'pdf') => {
    if (!reportData) return;
    onExportReport?.(reportData, format);
  };

  const renderReportPreview = () => {
    if (!reportData) return null;

    return (
      <div className="report-preview">
        <div className="report-preview__header">
          <h3>{reportData.name}</h3>
          <div className="report-meta">
            <span>Generated: {new Date(reportData.generatedAt).toLocaleString()}</span>
            <span>Type: {reportTemplates[reportData.type].name}</span>
            <span>Period: {reportData.dateRange.start} to {reportData.dateRange.end}</span>
          </div>
        </div>

        <div className="report-content">
          {reportData.data.overview && (
            <div className="report-section">
              <h4>Overview</h4>
              <div className="overview-grid">
                <div className="overview-stat">
                  <span className="stat-label">Total Games</span>
                  <span className="stat-value">{reportData.data.overview.totalGames}</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-label">Total Players</span>
                  <span className="stat-value">{reportData.data.overview.totalPlayers}</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-label">Average Score</span>
                  <span className="stat-value">{Math.round(reportData.data.overview.averageScore)}</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-label">Completion Rate</span>
                  <span className="stat-value">{Math.round(reportData.data.overview.completionRate)}%</span>
                </div>
              </div>
            </div>
          )}

          {reportData.data.playerStats && (
            <div className="report-section">
              <h4>Top Players</h4>
              <div className="player-rankings-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.playerStats.topPlayers.slice(0, 5).map((player, index) => (
                      <tr key={index}>
                        <td>#{player.rank}</td>
                        <td>{player.name}</td>
                        <td>{player.score}</td>
                        <td>{Math.round(player.accuracy)}%</td>
                        <td>{player.gamesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="report-actions">
          <button 
            className="report-btn report-btn--secondary"
            onClick={() => setShowSaveDialog(true)}
          >
            <FaSave /> Save Report
          </button>
          <button 
            className="report-btn report-btn--primary"
            onClick={() => exportReport('pdf')}
          >
            <FaDownload /> Export PDF
          </button>
          <button 
            className="report-btn report-btn--outline"
            onClick={() => exportReport('csv')}
          >
            <FaFileExport /> Export CSV
          </button>
          <button 
            className="report-btn report-btn--outline"
            onClick={() => window.print()}
          >
            <FaPrint /> Print
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="reporting-system">
      <div className="reporting-header">
        <h2>
          <FaFileAlt className="reporting-icon" />
          Advanced Reporting System
        </h2>
        <p>Generate comprehensive reports and analytics for your quiz games</p>
      </div>

      <div className="reporting-content">
        {/* Left Panel - Configuration */}
        <div className="reporting-config">
          <div className="config-section">
            <h3>Report Type</h3>
            <div className="report-templates">
              {Object.entries(reportTemplates).map(([key, template]) => (
                <div 
                  key={key}
                  className={`template-card ${reportType === key ? 'template-card--selected' : ''}`}
                  onClick={() => setReportType(key)}
                >
                  <div className="template-icon">{template.icon}</div>
                  <div className="template-info">
                    <h4>{template.name}</h4>
                    <p>{template.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="config-section">
            <h3>Date Range</h3>
            <div className="date-range">
              <div className="date-input">
                <label>Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="date-input">
                <label>End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>Filters</h3>
            <div className="filters-grid">
              <div className="filter-item">
                <label>Game Status</label>
                <select 
                  value={filters.gameStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, gameStatus: e.target.value }))}
                >
                  <option value="all">All Games</option>
                  <option value="completed">Completed</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Category</label>
                <select 
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="all">All Categories</option>
                  <option value="general">General Knowledge</option>
                  <option value="science">Science</option>
                  <option value="history">History</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Difficulty</label>
                <select 
                  value={filters.difficulty}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          <div className="config-section">
            <button 
              className="generate-report-btn"
              onClick={generateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <FaSpinner className="spinning" />
                  Generating...
                </>
              ) : (
                <>
                  <FaChartBar />
                  Generate Report
                </>
              )}
            </button>
          </div>

          {/* Saved Reports */}
          <div className="config-section">
            <h3>Saved Reports</h3>
            <div className="saved-reports">
              {savedReports.length === 0 ? (
                <p className="no-reports">No saved reports yet</p>
              ) : (
                savedReports.map((report) => (
                  <div key={report.id} className="saved-report-item">
                    <div className="saved-report-info">
                      <h4>{report.name}</h4>
                      <p>{new Date(report.savedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="saved-report-actions">
                      <button 
                        className="report-action-btn"
                        onClick={() => loadReport(report)}
                        title="Load Report"
                      >
                        <FaEye />
                      </button>
                      <button 
                        className="report-action-btn"
                        onClick={() => deleteReport(report.id)}
                        title="Delete Report"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="reporting-preview">
          {reportData ? (
            renderReportPreview()
          ) : (
            <div className="preview-placeholder">
              <FaFileAlt className="placeholder-icon" />
              <h3>No Report Generated</h3>
              <p>Configure your report settings and click "Generate Report" to see the preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="save-dialog">
            <div className="save-dialog__header">
              <h3>Save Report</h3>
              <button 
                className="close-btn"
                onClick={() => setShowSaveDialog(false)}
              >
                ×
              </button>
            </div>
            <div className="save-dialog__content">
              <label>Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name..."
                autoFocus
              />
            </div>
            <div className="save-dialog__actions">
              <button 
                className="report-btn report-btn--secondary"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="report-btn report-btn--primary"
                onClick={saveReport}
                disabled={!reportName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReportingSystem.propTypes = {
  gameData: PropTypes.array,
  playerData: PropTypes.array,
  questionData: PropTypes.array,
  onGenerateReport: PropTypes.func,
  onSaveReport: PropTypes.func,
  onExportReport: PropTypes.func
};

export default ReportingSystem;
