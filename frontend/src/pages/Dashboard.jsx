import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './dashboard.css';

function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCreateQuiz = () => {
    // TODO: Navigate to quiz creation page
    console.log('Create new quiz');
  };

  const handleQuickStart = () => {
    // Navigate to existing host flow for now
    navigate('/host');
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="dashboard-title">TUIZ情報王</h1>
            <p className="welcome-message">おかえりなさい、{user.username}さん！</p>
          </div>
          <div className="header-right">
            <span className="user-info">
              👤 {user.username}
            </span>
            <button className="logout-button" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        </header>

        {/* Main Dashboard */}
        <main className="dashboard-main">
          {/* Quick Actions */}
          <section className="quick-actions">
            <h2>クイック操作</h2>
            <div className="action-grid">
              <div className="action-card" onClick={handleCreateQuiz}>
                <div className="action-icon">✏️</div>
                <h3>新しいクイズを作成</h3>
                <p>オリジナルクイズを作成して管理しましょう</p>
                <div className="action-badge coming-soon">準備中</div>
              </div>

              <div className="action-card" onClick={handleQuickStart}>
                <div className="action-icon">🚀</div>
                <h3>クイックスタート</h3>
                <p>デフォルトクイズで今すぐゲームを開始</p>
              </div>

              <div className="action-card disabled">
                <div className="action-icon">📊</div>
                <h3>分析・統計</h3>
                <p>過去のゲーム結果を確認・分析</p>
                <div className="action-badge coming-soon">準備中</div>
              </div>

              <div className="action-card disabled">
                <div className="action-icon">📂</div>
                <h3>クイズライブラリ</h3>
                <p>作成したクイズを管理・編集</p>
                <div className="action-badge coming-soon">準備中</div>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="recent-activity">
            <h2>最近のアクティビティ</h2>
            <div className="activity-card">
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>アクティビティはまだありません</h3>
                <p>クイズを作成または開始すると、ここに履歴が表示されます</p>
              </div>
            </div>
          </section>

          {/* Stats Overview */}
          <section className="stats-overview">
            <h2>統計概要</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">作成したクイズ</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">開催したゲーム</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">参加者総数</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">新規</div>
                <div className="stat-label">アカウント状態</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
