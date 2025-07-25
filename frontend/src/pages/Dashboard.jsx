import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import socket from '../socket';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useConfirmation } from '../hooks/useConfirmation';
import './dashboard.css';

function Dashboard() {
  const { user, logout, isAuthenticated, apiCall } = useAuth();
  const navigate = useNavigate();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const [myQuizSets, setMyQuizSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    totalQuizSets: 0,
    totalGames: 0,
    totalPlayers: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Fetch user's quiz sets when authenticated
      fetchMyQuizSets();
    }
  }, [isAuthenticated, navigate]);

  // Helper function to show messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000); // Clear message after 5 seconds
  };

  const fetchMyQuizSets = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/question-sets/my-sets');
      const questionSets = response.questionSets || [];
      setMyQuizSets(questionSets);
      
      // Update stats
      setStats({
        totalQuizSets: questionSets.length,
        totalGames: questionSets.reduce((sum, qs) => sum + (qs.times_played || 0), 0),
        totalPlayers: 0 // Could be calculated from game data if available
      });
    } catch (error) {
      console.error('Error fetching quiz sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCreateQuiz = () => {
    // Navigate to quiz creation page
    navigate('/create-quiz');
  };

  const handleQuickStart = () => {
    // Navigate to existing host flow for now
    navigate('/host');
  };

  const handleStartQuiz = (questionSetId, title) => {
    // Start a game with the selected quiz set
    const gameTitle = `${title} - ${new Date().toLocaleTimeString()}`;
    
    socket.emit('createGame', { 
      hostId: `host_${user.id}_${Date.now()}`,
      questionSetId: questionSetId,
      settings: {
        title: gameTitle,
        maxPlayers: 50,
        questionTime: 30
      }
    });
    
    // Listen for game creation success
    socket.once('gameCreated', ({ game, gameCode }) => {
      console.log('Game created successfully:', game);
      navigate('/host/lobby', { state: { room: gameCode, title: gameTitle, gameId: game.id } });
    });
    
    // Listen for errors
    socket.once('error', ({ message }) => {
      console.error('Game creation failed:', message);
      alert('ゲーム作成に失敗しました: ' + message);
    });
  };

  const handleEditQuiz = (questionSetId) => {
    // Navigate to edit quiz (could be implemented later)
    navigate('/create-quiz', { state: { editMode: true, questionSetId } });
  };

  const handleDeleteQuiz = async (questionSetId, title) => {
    try {
      const confirmed = await showConfirmation({
        title: 'クイズセットを削除',
        message: `"${title}" を削除しますか？この操作は取り消せません。`,
        confirmText: '削除する',
        cancelText: 'キャンセル',
        type: 'danger'
      });

      if (!confirmed) return;
      
      await apiCall(`/question-sets/${questionSetId}`, { method: 'DELETE' });
      showMessage('success', 'クイズセットが削除されました。');
      fetchMyQuizSets(); // Refresh the list
    } catch (error) {
      console.error('Error deleting quiz set:', error);
      showMessage('error', '削除に失敗しました: ' + error.message);
    }
  };

  // Helper function to get difficulty label
  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '簡単';
      case 'medium': return '普通';
      case 'hard': return '難しい';
      case 'expert': return '上級';
      default: return '普通';
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="dashboard-title">TUIZ情報王</h1>
            <p className="welcome-message">おかえりなさい、{user.name}さん！</p>
          </div>
          <div className="header-right">
            <button 
              className="profile-button"
              onClick={() => setShowProfileModal(true)}
              title="プロフィール設定"
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt="プロフィール画像" 
                  className="user-avatar"
                />
              ) : (
                <span className="user-avatar-placeholder">👤</span>
              )}
              {user.name}
            </button>
            <button className="logout-button" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        </header>

        {/* Message Display */}
        {message.text && (
          <div className={`message-banner ${message.type}`}>
            <span className="message-icon">
              {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="message-text">{message.text}</span>
            <button 
              className="message-close"
              onClick={() => setMessage({ type: '', text: '' })}
            >
              ×
            </button>
          </div>
        )}

        {/* Main Dashboard */}
        <main className="dashboard-main">
          {/* Quick Actions */}
          <section className="quick-actions">
            <h2>クイック操作</h2>
            <div className="action-grid">
              <div className="action-card" onClick={handleCreateQuiz}>
                <div className="action-icon">✏️</div>
                <h3>新しいクイズを作成</h3>
                <p>オリジナルクイズを作成して管理</p>
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

              <div className="action-card" onClick={() => navigate('/create-quiz')}>
                <div className="action-icon">📂</div>
                <h3>クイズライブラリ</h3>
                <p>作成したクイズを管理・編集</p>
              </div>
            </div>
          </section>

          {/* My Quiz Sets */}
          <section className="my-quiz-sets">

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner">⌛</div>
                <p>クイズセットを読み込み中...</p>
              </div>
            ) : myQuizSets.length === 0 ? (
              <div className="empty-state">
                <h2>マイクイズ</h2>
                <div className="empty-icon">📝</div>
                <h3>クイズセットがありません</h3>
                <p>最初のクイズセットを作成してみましょう！</p>
                <button className="button primary" onClick={handleCreateQuiz}>
                  クイズを作成
                </button>
              </div>
            ) : (
              <div className="quiz-sets-grid">
                {myQuizSets.map((quizSet) => (
                  <div key={quizSet.id} className="quiz-set-card">
                    <div className="quiz-set-header">
                      <h3 className="quiz-set-title">{quizSet.title}</h3>
                      <div className="quiz-set-meta">
                        <span className="question-count">{quizSet.total_questions || 0}問</span>
                        <span className="difficulty">{getDifficultyLabel(quizSet.difficulty_level)}</span>
                      </div>
                    </div>
                    
                    {quizSet.description && (
                      <p className="quiz-set-description">{quizSet.description}</p>
                    )}
                    
                    <div className="quiz-set-stats">
                      <div className="stat-item">
                        <span className="stat-icon">🎮</span>
                        <span className="stat-text">{quizSet.times_played || 0}回プレイ</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">⭐</span>
                        <span className="stat-text">平均{(quizSet.average_score || 0).toFixed(1)}点</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">{quizSet.is_public ? '🌐' : '🔒'}</span>
                        <span className="stat-text">{quizSet.is_public ? '公開' : '非公開'}</span>
                      </div>
                    </div>
                    
                    <div className="quiz-set-actions">
                      <button 
                        className="action-button primary"
                        onClick={() => handleStartQuiz(quizSet.id, quizSet.title)}
                        disabled={!quizSet.total_questions || quizSet.total_questions === 0}
                      >
                        🚀 ゲーム開始
                      </button>
                      <button 
                        className="action-button secondary"
                        onClick={() => handleEditQuiz(quizSet.id)}
                      >
                        ✏️ 編集
                      </button>
                      <button 
                        className="action-button danger"
                        onClick={() => handleDeleteQuiz(quizSet.id, quizSet.title)}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                    
                    <div className="quiz-set-footer">
                      <span className="created-date">
                        作成日: {new Date(quizSet.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <div className="stat-number">{stats.totalQuizSets}</div>
                <div className="stat-label">作成したクイズ</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalGames}</div>
                <div className="stat-label">開催したゲーム</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalPlayers}</div>
                <div className="stat-label">参加者総数</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{user?.created_at ? '登録済み' : '新規'}</div>
                <div className="stat-label">アカウント状態</div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal {...confirmationProps} />
    </div>
  );
}

export default Dashboard;
