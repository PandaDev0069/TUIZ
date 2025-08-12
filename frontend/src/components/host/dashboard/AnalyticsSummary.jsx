import { useState, useEffect } from 'react';
import { 
  FaChartBar, 
  FaChartLine, 
  FaChartPie,
  FaBolt,
  FaClock,
  FaEye,
  FaUsers,
  FaTrophy,
  FaCheckCircle,
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaEquals
} from 'react-icons/fa';
import './AnalyticsSummary.css';

/**
 * AnalyticsSummary - Analytics Summary with real-time insights
 * Phase 2.1: Host Dashboard Component
 * 
 * Features:
 * - Response rate graphs
 * - Engagement metrics
 * - Real-time insights
 * - Performance tracking
 */
function AnalyticsSummary({ analytics, players, gameState }) {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [historicalData, setHistoricalData] = useState([]);

  // Calculate derived metrics
  const engagementLevel = analytics.engagementScore > 80 ? 'high' : 
                         analytics.engagementScore > 50 ? 'medium' : 'low';
  
  const responseRateColor = analytics.responseRate > 80 ? 'success' : 
                           analytics.responseRate > 50 ? 'warning' : 'danger';
  
  const participationTrend = analytics.participationRate > 70 ? 'up' : 
                            analytics.participationRate > 40 ? 'stable' : 'down';

  // Mock historical data for demo
  useEffect(() => {
    const mockData = [
      { time: '0:30', responses: 85, engagement: 72 },
      { time: '1:00', responses: 92, engagement: 78 },
      { time: '1:30', responses: 89, engagement: 81 },
      { time: '2:00', responses: 94, engagement: 85 },
      { time: '2:30', responses: 88, engagement: 79 }
    ];
    setHistoricalData(mockData);
  }, []);

  const formatPercentage = (value) => {
    return `${Math.round(value || 0)}%`;
  };

  const formatTime = (seconds) => {
    return `${(seconds || 0).toFixed(1)}秒`;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <FaArrowUp className="trend-icon trend-icon--up" />;
      case 'down': return <FaArrowDown className="trend-icon trend-icon--down" />;
      default: return <FaEquals className="trend-icon trend-icon--stable" />;
    }
  };

  return (
    <div className="analytics-summary">
      <div className="analytics-summary__header">
        <h3 className="analytics-summary__title">
          <FaChartBar className="analytics-summary__title-icon" />
          分析サマリー
        </h3>
        
        <div className="analytics-summary__controls">
          <select 
            className="analytics-metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="overview">概要</option>
            <option value="engagement">エンゲージメント</option>
            <option value="performance">パフォーマンス</option>
            <option value="trends">トレンド</option>
          </select>
        </div>
      </div>

      <div className="analytics-summary__content">
        {selectedMetric === 'overview' && (
          <div className="analytics-overview">
            {/* Key Metrics Grid */}
            <div className="key-metrics">
              <div className="metric-tile metric-tile--response">
                <div className="metric-tile__icon">
                  <FaCheckCircle className={`metric-icon metric-icon--${responseRateColor}`} />
                </div>
                <div className="metric-tile__content">
                  <div className="metric-tile__label">回答率</div>
                  <div className="metric-tile__value">
                    {formatPercentage(analytics.responseRate)}
                  </div>
                  <div className="metric-tile__trend">
                    {getTrendIcon(participationTrend)}
                    <span className="metric-tile__trend-text">
                      {players.length > 0 ? `${players.length}人中` : '待機中'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-tile metric-tile--time">
                <div className="metric-tile__icon">
                  <FaClock className="metric-icon metric-icon--info" />
                </div>
                <div className="metric-tile__content">
                  <div className="metric-tile__label">平均回答時間</div>
                  <div className="metric-tile__value">
                    {formatTime(analytics.averageResponseTime)}
                  </div>
                  <div className="metric-tile__trend">
                    <span className="metric-tile__trend-text">
                      {analytics.averageResponseTime < 5 ? '高速' : 
                       analytics.averageResponseTime < 10 ? '普通' : '低速'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-tile metric-tile--engagement">
                <div className="metric-tile__icon">
                  <FaBolt className={`metric-icon metric-icon--${engagementLevel === 'high' ? 'success' : engagementLevel === 'medium' ? 'warning' : 'danger'}`} />
                </div>
                <div className="metric-tile__content">
                  <div className="metric-tile__label">エンゲージメント</div>
                  <div className="metric-tile__value">
                    {formatPercentage(analytics.engagementScore)}
                  </div>
                  <div className="metric-tile__trend">
                    <span className={`engagement-level engagement-level--${engagementLevel}`}>
                      {engagementLevel === 'high' ? '高' : 
                       engagementLevel === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-tile metric-tile--participation">
                <div className="metric-tile__icon">
                  <FaUsers className="metric-icon metric-icon--info" />
                </div>
                <div className="metric-tile__content">
                  <div className="metric-tile__label">参加率</div>
                  <div className="metric-tile__value">
                    {formatPercentage(analytics.participationRate)}
                  </div>
                  <div className="metric-tile__trend">
                    {getTrendIcon(participationTrend)}
                    <span className="metric-tile__trend-text">
                      {analytics.participationRate > 70 ? '優秀' : '要改善'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="performance-indicators">
              <div className="performance-indicator">
                <div className="performance-indicator__header">
                  <FaEye className="performance-indicator__icon" />
                  <span className="performance-indicator__label">リアルタイム状況</span>
                </div>
                <div className="performance-indicator__content">
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="status-item__label">アクティブプレイヤー</span>
                      <span className="status-item__value">
                        {players.filter(p => p.score > 0).length} / {players.length}
                      </span>
                    </div>
                    
                    <div className="status-item">
                      <span className="status-item__label">ゲーム状態</span>
                      <span className={`status-item__value status-item__value--${gameState.status}`}>
                        {gameState.status === 'waiting' && '待機中'}
                        {gameState.status === 'active' && '進行中'}
                        {gameState.status === 'paused' && '一時停止'}
                        {gameState.status === 'finished' && '終了'}
                      </span>
                    </div>
                    
                    <div className="status-item">
                      <span className="status-item__label">問題進捗</span>
                      <span className="status-item__value">
                        {gameState.currentQuestionIndex + 1} / {gameState.totalQuestions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'engagement' && (
          <div className="analytics-engagement">
            <div className="engagement-chart">
              <div className="engagement-chart__header">
                <FaBolt className="engagement-chart__icon" />
                <span className="engagement-chart__title">エンゲージメント詳細</span>
              </div>
              
              <div className="engagement-breakdown">
                <div className="engagement-metric">
                  <div className="engagement-metric__label">参加積極性</div>
                  <div className="engagement-bar">
                    <div 
                      className="engagement-bar__fill engagement-bar__fill--success"
                      style={{ width: `${analytics.participationRate || 0}%` }}
                    ></div>
                  </div>
                  <div className="engagement-metric__value">
                    {formatPercentage(analytics.participationRate)}
                  </div>
                </div>
                
                <div className="engagement-metric">
                  <div className="engagement-metric__label">回答速度</div>
                  <div className="engagement-bar">
                    <div 
                      className="engagement-bar__fill engagement-bar__fill--info"
                      style={{ width: `${Math.max(0, 100 - (analytics.averageResponseTime || 0) * 10)}%` }}
                    ></div>
                  </div>
                  <div className="engagement-metric__value">
                    {analytics.averageResponseTime < 5 ? '高速' : '普通'}
                  </div>
                </div>
                
                <div className="engagement-metric">
                  <div className="engagement-metric__label">正解率</div>
                  <div className="engagement-bar">
                    <div 
                      className="engagement-bar__fill engagement-bar__fill--warning"
                      style={{ width: `${analytics.responseRate || 0}%` }}
                    ></div>
                  </div>
                  <div className="engagement-metric__value">
                    {formatPercentage(analytics.responseRate)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'performance' && (
          <div className="analytics-performance">
            <div className="performance-summary">
              <div className="performance-card">
                <FaTrophy className="performance-card__icon performance-card__icon--gold" />
                <div className="performance-card__content">
                  <div className="performance-card__label">トッププレイヤー</div>
                  <div className="performance-card__value">
                    {gameState.currentLeader?.name || 'N/A'}
                  </div>
                  <div className="performance-card__meta">
                    {gameState.currentLeader?.score || 0} ポイント
                  </div>
                </div>
              </div>
              
              <div className="performance-card">
                <FaCheckCircle className="performance-card__icon performance-card__icon--success" />
                <div className="performance-card__content">
                  <div className="performance-card__label">正解プレイヤー</div>
                  <div className="performance-card__value">
                    {players.filter(p => p.correctAnswers > 0).length}
                  </div>
                  <div className="performance-card__meta">
                    {players.length > 0 ? formatPercentage((players.filter(p => p.correctAnswers > 0).length / players.length) * 100) : '0%'}
                  </div>
                </div>
              </div>
              
              <div className="performance-card">
                <FaClock className="performance-card__icon performance-card__icon--info" />
                <div className="performance-card__content">
                  <div className="performance-card__label">最速回答</div>
                  <div className="performance-card__value">
                    {formatTime(Math.min(...players.map(p => p.averageTime || Infinity).filter(t => t !== Infinity)) || 0)}
                  </div>
                  <div className="performance-card__meta">
                    記録更新中
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'trends' && (
          <div className="analytics-trends">
            <div className="trend-chart">
              <div className="trend-chart__header">
                <FaChartLine className="trend-chart__icon" />
                <span className="trend-chart__title">トレンド分析</span>
              </div>
              
              <div className="trend-visualization">
                {historicalData.map((data, index) => (
                  <div key={index} className="trend-point">
                    <div className="trend-point__time">{data.time}</div>
                    <div className="trend-point__bars">
                      <div 
                        className="trend-bar trend-bar--responses"
                        style={{ height: `${data.responses}%` }}
                        title={`回答率: ${data.responses}%`}
                      ></div>
                      <div 
                        className="trend-bar trend-bar--engagement"
                        style={{ height: `${data.engagement}%` }}
                        title={`エンゲージメント: ${data.engagement}%`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="trend-legend">
                <div className="trend-legend__item">
                  <div className="trend-legend__color trend-legend__color--responses"></div>
                  <span className="trend-legend__label">回答率</span>
                </div>
                <div className="trend-legend__item">
                  <div className="trend-legend__color trend-legend__color--engagement"></div>
                  <span className="trend-legend__label">エンゲージメント</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insights */}
      <div className="analytics-summary__insights">
        <div className="quick-insights">
          <div className="quick-insights__header">
            <FaBolt className="quick-insights__icon" />
            <span className="quick-insights__title">クイック洞察</span>
          </div>
          
          <div className="quick-insights__list">
            {analytics.engagementScore > 80 && (
              <div className="insight-item insight-item--positive">
                <FaCheckCircle className="insight-item__icon" />
                <span className="insight-item__text">
                  高いエンゲージメントを維持中！
                </span>
              </div>
            )}
            
            {analytics.responseRate < 60 && (
              <div className="insight-item insight-item--warning">
                <FaTimes className="insight-item__icon" />
                <span className="insight-item__text">
                  回答率が低下しています。時間を追加してみてください。
                </span>
              </div>
            )}
            
            {analytics.averageResponseTime > 15 && (
              <div className="insight-item insight-item--info">
                <FaClock className="insight-item__icon" />
                <span className="insight-item__text">
                  回答時間が長めです。問題の難易度を確認してください。
                </span>
              </div>
            )}
            
            {players.length === 0 && (
              <div className="insight-item insight-item--neutral">
                <FaUsers className="insight-item__icon" />
                <span className="insight-item__text">
                  プレイヤーの参加を待っています...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsSummary;
