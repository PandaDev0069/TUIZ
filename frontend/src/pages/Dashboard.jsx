import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { showError } from '../utils/toast';
import socket from '../socket';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useConfirmation } from '../hooks/useConfirmation';
import { useTimerManager } from '../utils/timerManager';
import './dashboard.css';

function Dashboard() {
  const { user, logout, isAuthenticated, apiCall, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const timerManager = useTimerManager();
  const [myQuizSets, setMyQuizSets] = useState([]);
  const [draftQuizzes, setDraftQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileImageError, setProfileImageError] = useState(false);
  const [stats, setStats] = useState({
    totalQuizSets: 0,
    totalGames: 0,
    totalPlayers: 0,
    draftCount: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Fetch user's quiz sets when authenticated
      fetchMyQuizSets();
      // Refresh user data to ensure we have the latest profile information
      refreshUserData();
    }
  }, [isAuthenticated, navigate]);

  // Refresh user data when component mounts
  const refreshUserData = async () => {
    try {
      await refreshUser();
      setProfileImageError(false); // Reset image error state
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Handle profile image load error
  const handleImageError = () => {
    setProfileImageError(true);
  };

  // Handle profile image load success
  const handleImageLoad = () => {
    setProfileImageError(false);
  };

  // Helper function to show messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    timerManager.setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000); // Clear message after 5 seconds
  };

  const fetchMyQuizSets = async () => {
    try {
      setLoading(true);
      
      // Fetch all quizzes (both published and drafts)
      const response = await apiCall('/quiz/my-quizzes');
      const allQuizzes = response.quizzes || [];
      
      // Separate published quizzes from drafts
      const publishedQuizzes = allQuizzes.filter(quiz => quiz.status === 'published');
      const regularDrafts = allQuizzes.filter(quiz => 
        (quiz.status === 'draft' || quiz.status === 'creating') && 
        !quiz.play_settings?.was_published
      );
      const editingPublished = allQuizzes.filter(quiz => 
        quiz.status === 'draft' && 
        quiz.play_settings?.was_published
      );
      
      setMyQuizSets(publishedQuizzes);
      setDraftQuizzes([...regularDrafts, ...editingPublished]); // Combine both types of drafts
      
      // Update stats
      setStats({
        totalQuizSets: publishedQuizzes.length,
        totalGames: publishedQuizzes.reduce((sum, qs) => sum + (qs.times_played || 0), 0),
        totalPlayers: 0, // Could be calculated from game data if available
        draftCount: draftQuizzes.length
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching quiz sets:', error);
      }
      showMessage('error', 'クイズデータの取得に失敗しました: ' + error.message);
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

  const handleStartQuiz = (questionSetId, title) => {
    // Start a game with the selected quiz set - let server fetch title from DB
    
    socket.emit('createGame', { 
      hostId: `host_${user.id}`,
      questionSetId: questionSetId,
      settings: {
        title: null, // Let server fetch title from question set
        fromQuestionSet: true // Flag to indicate we want to use question set settings
      }
    });
    
    // Listen for game creation success
    socket.once('gameCreated', ({ game, gameCode }) => {
      if (import.meta.env.DEV) {
        console.log('Game created successfully:', game);
      }
      // Use the title from the game object (which includes the resolved title from the server)
      const resolvedTitle = game.game_settings?.title || 'クイズゲーム';
      navigate('/host/lobby', { state: { room: gameCode, title: resolvedTitle, gameId: game.id, questionSetId: questionSetId } });
    });
    
    // Listen for errors
    socket.once('error', ({ message }) => {
      if (import.meta.env.DEV) {
        console.error('Game creation failed:', message);
      }
      showError('ゲーム作成に失敗しました: ' + message);
    });
  };

  const handleEditQuiz = async (questionSetId) => {
    try {
      // First, change the status to 'draft' to allow editing
      await apiCall(`/quiz/${questionSetId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'draft',
          was_published: true // Indicate this was previously published
        })
      });
      
      showMessage('success', 'クイズが編集モードになりました。');
      
      // Navigate to edit quiz page
      navigate('/create-quiz', { 
        state: { 
          editMode: true, 
          questionSetId,
          wasPublished: true // Flag to indicate it was previously published
        } 
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error setting quiz to draft mode:', error);
      }
      showMessage('error', '編集モードへの変更に失敗しました: ' + error.message);
    }
  };

  const handleContinueEditingDraft = (draftId) => {
    // Navigate to create quiz with draft data
    navigate('/create-quiz', { 
      state: { 
        editMode: true, 
        draftMode: true, 
        questionSetId: draftId 
      } 
    });
  };

  const handleDeleteDraft = async (draftId, title) => {
    try {
      const confirmed = await showConfirmation({
        title: '下書きを削除',
        message: `"${title}" の下書きを削除しますか？この操作は取り消せません。`,
        confirmText: '削除する',
        cancelText: 'キャンセル',
        type: 'danger'
      });

      if (!confirmed) return;
      
      await apiCall(`/quiz/${draftId}`, { method: 'DELETE' });
      showMessage('success', '下書きが削除されました。');
      fetchMyQuizSets(); // Refresh the list
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting draft:', error);
      }
      showMessage('error', '削除に失敗しました: ' + error.message);
    }
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
      
      await apiCall(`/quiz/${questionSetId}`, { method: 'DELETE' });
      showMessage('success', 'クイズセットが削除されました。');
      fetchMyQuizSets(); // Refresh the list
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting quiz set:', error);
      }
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
    <div className="dashboard">
      <div className="dashboard__content">
        {/* Header */}
        <header className="dashboard__header">
          <div className="dashboard__header-left">
            <h1 className="dashboard__title">TUIZ情報王</h1>
            <p className="dashboard__welcome-message">おかえりなさい、{user.name}さん！</p>
          </div>
          <div className="dashboard__header-right">
            <button 
              className="dashboard__profile-button"
              onClick={() => setShowProfileModal(true)}
              title="プロフィール設定"
            >
              {user.avatar_url && !profileImageError ? (
                <img 
                  src={user.avatar_url} 
                  alt="プロフィール画像" 
                  className="dashboard__user-avatar"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              ) : (
                <span className="dashboard__user-avatar-placeholder">👤</span>
              )}
              {user.name}
            </button>
            <button 
              className="new-dashboard-button" 
              onClick={() => navigate('/new-dashboard')}
              title="Go to New upcoming Dashboard"
            >
              🎨 New Dashboard
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

              <div className="action-card" onClick={() => navigate('/join')}>
                <div className="action-icon">🎮</div>
                <h3>ゲームに参加</h3>
                <p>ルームコードでゲームに参加する</p>
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

          {/* Draft Quizzes Section */}
          {draftQuizzes.length > 0 && (
            <section className="draft-quizzes">
              <div className="section-header">
                <h2>下書き保存されたクイズ</h2>
                <span className="section-badge">{draftQuizzes.length}件</span>
              </div>
              <div className="draft-quizzes-grid">
                {draftQuizzes.map((draft) => (
                  <div key={draft.id} className="draft-quiz-card">
                    <div className="draft-header">
                      <div className="draft-icon">📝</div>
                      <div className="draft-info">
                        <h3 className="draft-title">{draft.title || 'Untitled Quiz'}</h3>
                        <div className="draft-meta">
                          <span className="draft-status">
                            {draft.status === 'draft' ? '下書き' : '作成中'}
                          </span>
                          <span className="draft-date">
                            {new Date(draft.updated_at).toLocaleDateString()} 更新
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {draft.description && (
                      <p className="draft-description">{draft.description}</p>
                    )}
                    
                    <div className="draft-progress">
                      <div className="progress-info">
                        <span className="progress-text">
                          {draft.total_questions || 0}問作成済み
                        </span>
                        {draft.category && (
                          <span className="draft-category">{draft.category}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="draft-actions">
                      <button 
                        className="action-button primary"
                        onClick={() => handleContinueEditingDraft(draft.id)}
                      >
                        ✏️ 編集を続ける
                      </button>
                      <button 
                        className="action-button danger"
                        onClick={() => handleDeleteDraft(draft.id, draft.title)}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* My Quiz Sets */}
          <section className="my-quiz-sets">

            {loading ? (
              <div className="loading-state">
                <LoadingSkeleton type="text" count={3} />
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
                <div className="stat-label">公開済みクイズ</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.draftCount}</div>
                <div className="stat-label">下書きクイズ</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalGames}</div>
                <div className="stat-label">開催したゲーム</div>
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
        onProfileUpdated={refreshUserData}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal {...confirmationProps} />
    </div>
  );
}

export default Dashboard;
