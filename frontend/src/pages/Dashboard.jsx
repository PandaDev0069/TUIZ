import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useConfirmation } from '../hooks/useConfirmation';
import { showError, showSuccess } from '../utils/toast';
import socket from '../socket';
import '../utils/AnimationController'; // Ensure AnimationController is loaded
import '../utils/ViewportFix'; // Ensure ViewportFix is loaded for mobile viewport handling
import './dashboard.css';

// React Icons (FA Icons)
import { 
  FaUser, 
  FaSignOutAlt, 
  FaEdit, 
  FaGamepad, 
  FaChartBar, 
  FaFolderOpen, 
  FaSearch, 
  FaRocket,
  FaTrash,
  FaPen,
  FaSearchPlus,
  FaGlobe,
  FaLock,
  FaClock,
  FaCalendarAlt,
  FaFire,
  FaAward,
  FaPlus,
  FaEye,
  FaHeart,
  FaExclamationTriangle
} from 'react-icons/fa';

// Helper Components
function Kpi({ label, value, sub }) {
  return (
    <div className="dashboard__kpi-card tuiz-animate-scale-in">
      <div className="dashboard__kpi-label">{label}</div>
      <div className="dashboard__kpi-value">{value}</div>
      {sub && <div className="dashboard__kpi-sub">{sub}</div>}
    </div>
  );
}

function Badge({ tone = "slate", children }) {
  return <span className={`dashboard__badge dashboard__badge--${tone}`}>{children}</span>;
}

function QuizCard({ quiz, onEdit, onStart, onDelete, isDeleting = false, deletingQuizId }) {
  const [thumbnailError, setThumbnailError] = useState(false);

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '簡単';
      case 'medium': return '普通';
      case 'hard': return '難しい';
      case 'expert': return '上級';
      default: return '普通';
    }
  };

  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  const handleThumbnailLoad = () => {
    setThumbnailError(false);
  };

  const isThisQuizDeleting = deletingQuizId === quiz.id;

  return (
    <div className="dashboard__quiz-card tuiz-animate-scale-in tuiz-hover-lift">
      {quiz.thumbnail_url && !thumbnailError && (
        <div className="dashboard__quiz-card-thumbnail">
          <img 
            src={quiz.thumbnail_url} 
            alt={`${quiz.title} thumbnail`}
            className="dashboard__quiz-card-thumbnail-image"
            onError={handleThumbnailError}
            onLoad={handleThumbnailLoad}
          />
        </div>
      )}
      <div className="dashboard__quiz-card-header">
        <div className={`dashboard__quiz-card-visibility ${quiz.is_public ? 'dashboard__quiz-card-visibility--public' : 'dashboard__quiz-card-visibility--private'}`}>
          {quiz.is_public ? <FaGlobe className="dashboard__quiz-card-visibility-icon" /> : <FaLock className="dashboard__quiz-card-visibility-icon" />}
          <span>{quiz.is_public ? '公開' : '非公開'}</span>
        </div>
        <div className="dashboard__quiz-card-meta">
          <div className="dashboard__quiz-card-category">{quiz.category || "未分類"}</div>
          <div className="dashboard__quiz-card-date">
            <FaCalendarAlt className="dashboard__quiz-card-date-icon" />
            作成日 {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString('ja-JP') : '不明'}
          </div>
          <h3 className="dashboard__quiz-card-title">{quiz.title}</h3>
          <p className="dashboard__quiz-card-description">{quiz.description || "説明なし"}</p>
          <div className="dashboard__quiz-card-badges">
            <Badge tone="blue">{getDifficultyLabel(quiz.difficulty_level)}</Badge>
            <Badge tone="green">{quiz.total_questions || 0} 問</Badge>
            <span className="dashboard__quiz-card-plays">
              <FaFire className="dashboard__quiz-card-plays-icon" />
              プレイ {quiz.times_played || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="dashboard__quiz-card-actions">
        <button 
          className="dashboard__button dashboard__button--secondary tuiz-hover-scale" 
          onClick={() => onEdit(quiz)}
          disabled={isDeleting}
        >
          <FaEdit className="dashboard__button-icon" /> 編集
        </button>
        <button 
          className="dashboard__button dashboard__button--primary tuiz-hover-scale" 
          onClick={() => onStart(quiz)}
          disabled={isDeleting}
        >
          <FaRocket className="dashboard__button-icon" /> ゲーム開始
        </button>
        <button 
          className={`dashboard__button dashboard__button--danger tuiz-hover-scale ${isThisQuizDeleting ? 'dashboard__button--loading' : ''}`}
          onClick={() => onDelete(quiz)}
          disabled={isDeleting}
        >
          {isThisQuizDeleting ? (
            <>
              <div className="dashboard__loading-spinner tuiz-animate-spin"></div>
              削除中...
            </>
          ) : (
            <>
              <FaTrash className="dashboard__button-icon" /> 削除
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function DraftCard({ draft, onEdit, onDelete, isDeleting = false, deletingQuizId }) {
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  const handleThumbnailLoad = () => {
    setThumbnailError(false);
  };

  const isThisQuizDeleting = deletingQuizId === draft.id;

  return (
    <div className="dashboard__draft-card tuiz-animate-scale-in tuiz-hover-lift">
      {draft.thumbnail_url && !thumbnailError && (
        <div className="dashboard__draft-card-thumbnail">
          <img 
            src={draft.thumbnail_url} 
            alt={`${draft.title} thumbnail`}
            className="dashboard__draft-card-thumbnail-image"
            onError={handleThumbnailError}
            onLoad={handleThumbnailLoad}
          />
        </div>
      )}
      <div className="dashboard__draft-card-header">
        <div className="dashboard__draft-card-date">
          <FaClock className="dashboard__draft-card-date-icon" />
          最終更新 {new Date(draft.updated_at).toLocaleDateString()}
        </div>
        <h3 className="dashboard__draft-card-title">{draft.title}</h3>
        <p className="dashboard__draft-card-description">{draft.description || "説明なし"}</p>
        <div className="dashboard__draft-card-badges">
          <Badge tone="blue">{draft.difficulty_level || 'medium'}</Badge>
          <Badge tone="green">{draft.total_questions || 0} 問</Badge>
          <Badge tone="amber">{draft.status === 'draft' ? '下書き' : '作成中'}</Badge>
        </div>
      </div>
      <div className="dashboard__draft-card-actions">
        <button 
          className="dashboard__button dashboard__button--secondary tuiz-hover-scale" 
          onClick={() => onEdit(draft)}
          disabled={isDeleting}
        >
          <FaEdit className="dashboard__button-icon" /> 続きを編集
        </button>
        <button 
          className={`dashboard__button dashboard__button--danger tuiz-hover-scale ${isThisQuizDeleting ? 'dashboard__button--loading' : ''}`}
          onClick={() => onDelete(draft)}
          disabled={isDeleting}
        >
          {isThisQuizDeleting ? (
            <>
              <div className="dashboard__loading-spinner tuiz-animate-spin"></div>
              削除中...
            </>
          ) : (
            <>
              <FaTrash className="dashboard__button-icon" /> 削除
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser, apiCall, isAuthenticated } = useAuth();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const [profileImageError, setProfileImageError] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false); // Loading state for deleting
  const [deletingQuizId, setDeletingQuizId] = useState(null); // Track which quiz is being deleted
  const [myQuizSets, setMyQuizSets] = useState([]);
  const [draftQuizzes, setDraftQuizzes] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [stats, setStats] = useState({
    totalQuizSets: 0,
    totalGames: 0,
    draftCount: 0,
    totalPlayers: 0
  });

  // Fetch user's quiz data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchMyQuizSets();
      refreshUserData();
      checkActiveSession();
    }
  }, [isAuthenticated, navigate]);

  // Force animation initialization immediately
  useEffect(() => {
    // Ensure AnimationController is available and initialize animations
    if (window.tuizAnimations) {
      window.tuizAnimations.initializePageAnimations();
    }
    
    // Add ready class after a brief delay to prevent flash
    const timer = setTimeout(() => {
      const dashboardElement = document.querySelector('.dashboard');
      if (dashboardElement) {
        dashboardElement.classList.add('tuiz-animations-ready');
      }
    }, 50); // Very short delay to ensure CSS is loaded
    
    return () => clearTimeout(timer);
  }, []);

  const fetchMyQuizSets = async () => {
    try {
      setLoading(true);
      
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
      setDraftQuizzes([...regularDrafts, ...editingPublished]);
      
      // Update stats
      setStats({
        totalQuizSets: publishedQuizzes.length,
        totalGames: publishedQuizzes.reduce((sum, qs) => sum + (qs.times_played || 0), 0),
        draftCount: regularDrafts.length + editingPublished.length,
        totalPlayers: 0
      });
    } catch (error) {
      console.error('Error fetching quiz sets:', error);
      showError('クイズデータの取得に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      setCheckingSession(true);
      
      // Check localStorage for active host session
      const gameId = localStorage.getItem('tuiz_current_game_id');
      const room = localStorage.getItem('tuiz_current_room');
      const isHost = localStorage.getItem('tuiz_is_host') === 'true';
      const questionSetId = localStorage.getItem('tuiz_question_set_id');
      
      if (gameId && room && isHost) {
        // Verify the session with the backend
        const response = await apiCall(`/quiz/session/check`, {
          method: 'POST',
          body: JSON.stringify({ gameId, room })
        });
        
        if (response.isActive && response.gameStatus === 'waiting') {
          // Find the quiz title from our quiz sets
          const quiz = myQuizSets.find(q => q.id === questionSetId);
          const quizTitle = quiz?.title || 'クイズゲーム';
          
          setActiveSession({
            gameId,
            room,
            questionSetId,
            title: quizTitle,
            gameStatus: response.gameStatus,
            playerCount: response.playerCount || 0,
            createdAt: response.createdAt
          });
        } else {
          // Session is no longer active, clear localStorage
          clearSessionData();
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
      // If there's an error, assume session is invalid and clear it
      clearSessionData();
    } finally {
      setCheckingSession(false);
    }
  };

  const clearSessionData = () => {
    localStorage.removeItem('tuiz_current_game_id');
    localStorage.removeItem('tuiz_current_room');
    localStorage.removeItem('tuiz_player_name');
    localStorage.removeItem('tuiz_is_host');
    localStorage.removeItem('tuiz_question_set_id');
    setActiveSession(null);
  };

  const handleRejoinSession = () => {
    if (activeSession) {
      navigate('/host/lobby', {
        state: {
          room: activeSession.room,
          title: activeSession.title,
          gameId: activeSession.gameId,
          questionSetId: activeSession.questionSetId
        }
      });
    }
  };

  const handleDismissSession = async () => {
    try {
      const confirmed = await showConfirmation({
        title: '待機中のセッションを終了',
        message: 'この待機中のゲームセッションを終了しますか？参加者がいる場合は切断されます。',
        confirmText: '終了する',
        cancelText: 'キャンセル',
        type: 'warning'
      });

      if (!confirmed) return;

      // Emit end game to backend
      socket.emit('endGame', { gameCode: activeSession.room });
      
      // Clear session data
      clearSessionData();
      
      showSuccess('ゲームセッションを終了しました。');
    } catch (error) {
      console.error('Error ending session:', error);
      showError('セッション終了に失敗しました: ' + error.message);
    }
  };

  const refreshUserData = async () => {
    try {
      await refreshUser();
      setProfileImageError(false);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Filter quizzes based on search query
  const filteredQuizzes = useMemo(() => {
    if (!query.trim()) return myQuizSets;
    const q = query.toLowerCase();
    return myQuizSets.filter((quiz) => 
      [quiz.title, quiz.description, quiz.category].join(" ").toLowerCase().includes(q)
    );
  }, [query, myQuizSets]);

  // Memoize greeting to prevent it from changing on every render
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name || 'ユーザー';
    
    if (hour >= 5 && hour < 12) {
      const morningGreetings = [
        `おはようございます、${name}さん！`,
        `おはよう、${name}さん！今日も頑張りましょう！`,
        `朝のご挨拶、${name}さん！素晴らしい一日になりそうですね！`,
        `おはようございます、${name}さん！今日はどんなクイズを作りましょうか？`
      ];
      return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
    } else if (hour >= 12 && hour < 17) {
      const afternoonGreetings = [
        `こんにちは、${name}さん！`,
        `お疲れ様です、${name}さん！`,
        `午後のひととき、${name}さん！`,
        `こんにちは、${name}さん！クイズ作成はいかがですか？`
      ];
      return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
    } else if (hour >= 17 && hour < 22) {
      const eveningGreetings = [
        `こんばんは、${name}さん！`,
        `お疲れ様でした、${name}さん！`,
        `夕方のお時間、${name}さん！`,
        `こんばんは、${name}さん！今日の成果はいかがでしたか？`
      ];
      return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
    } else {
      const nightGreetings = [
        `こんばんは、${name}さん！`,
        `夜遅くまでお疲れ様です、${name}さん！`,
        `夜の時間も頑張っていますね、${name}さん！`,
        `こんばんは、${name}さん！夜更かしは程々にしてくださいね！`
      ];
      return nightGreetings[Math.floor(Math.random() * nightGreetings.length)];
    }
  }, [user?.name]); // Only recalculate when user name changes

  // Event handlers
  const handleStartQuiz = (quiz) => {
    socket.emit('createGame', { 
      hostId: `host_${user.id}`,
      questionSetId: quiz.id,
      settings: {
        title: null,
        fromQuestionSet: true
      }
    });
    
    socket.once('gameCreated', ({ game, gameCode }) => {
      const resolvedTitle = game.game_settings?.title || 'クイズゲーム';
      navigate('/host/lobby', { 
        state: { 
          room: gameCode, 
          title: resolvedTitle, 
          gameId: game.id, 
          questionSetId: quiz.id 
        } 
      });
    });
    
    socket.once('error', ({ message }) => {
      showError('ゲーム作成に失敗しました: ' + message);
    });
  };

  const handleEditQuiz = async (quiz) => {
    try {
      await apiCall(`/quiz/${quiz.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'draft',
          was_published: true
        })
      });
      
      showSuccess('クイズが編集モードになりました。');
      
      navigate('/create-quiz', { 
        state: { 
          editMode: true, 
          questionSetId: quiz.id,
          wasPublished: true
        } 
      });
    } catch (error) {
      console.error('Error setting quiz to draft mode:', error);
      showError('編集モードへの変更に失敗しました: ' + error.message);
    }
  };

  const handleContinueEditingDraft = (draft) => {
    navigate('/create-quiz', { 
      state: { 
        editMode: true, 
        draftMode: true, 
        questionSetId: draft.id 
      } 
    });
  };

  const handleDeleteQuiz = async (quiz) => {
    // Prevent multiple delete requests
    if (deleting || deletingQuizId === quiz.id) {
      return;
    }

    try {
      const confirmed = await showConfirmation({
        title: 'クイズセットを削除',
        message: `"${quiz.title}" を削除しますか？この操作は取り消せません。`,
        confirmText: '削除する',
        cancelText: 'キャンセル',
        type: 'danger'
      });

      if (!confirmed) return;

      setDeleting(true);
      setDeletingQuizId(quiz.id);
      
      await apiCall(`/quiz/${quiz.id}`, { method: 'DELETE' });
      showSuccess('クイズセットが削除されました。');
      fetchMyQuizSets();
    } catch (error) {
      console.error('Error deleting quiz set:', error);
      showError('削除に失敗しました: ' + error.message);
    } finally {
      setDeleting(false);
      setDeletingQuizId(null);
    }
  };

  const handleDeleteDraft = async (draft) => {
    // Prevent multiple delete requests
    if (deleting || deletingQuizId === draft.id) {
      return;
    }

    try {
      const confirmed = await showConfirmation({
        title: '下書きを削除',
        message: `"${draft.title}" の下書きを削除しますか？この操作は取り消せません。`,
        confirmText: '削除する',
        cancelText: 'キャンセル',
        type: 'danger'
      });

      if (!confirmed) return;

      setDeleting(true);
      setDeletingQuizId(draft.id);
      
      await apiCall(`/quiz/${draft.id}`, { method: 'DELETE' });
      showSuccess('下書きが削除されました。');
      fetchMyQuizSets();
    } catch (error) {
      console.error('Error deleting draft:', error);
      showError('削除に失敗しました: ' + error.message);
    } finally {
      setDeleting(false);
      setDeletingQuizId(null);
    }
  };

  const handleImageError = () => {
    setProfileImageError(true);
  };

  const handleImageLoad = () => {
    setProfileImageError(false);
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) return null;

  return (
    <div className="dashboard tuiz-animate-fade-in">
      <div className="dashboard__wrapper">
        {/* Header */}
        <header className="dashboard__header tuiz-animate-fade-in-down">
          <div className="dashboard__header-left">
            <div className="dashboard__logo-section">
              <img src="/logo.png" alt="TUIZ Logo" className="dashboard__logo tuiz-animate-float" />
              <div className="dashboard__title-group">
                <h1 className="dashboard__title tuiz-animate-scale-in tuiz-animate-stagger-1">TUIZ情報王</h1>
                <p className="dashboard__welcome-message tuiz-animate-fade-in tuiz-animate-stagger-2">{greeting}</p>
              </div>
            </div>
          </div>
          <div className="dashboard__header-right tuiz-animate-fade-in-left tuiz-animate-stagger-3">
            <button 
              className="dashboard__profile-button tuiz-hover-lift"
              onClick={() => setShowProfileModal(true)}
              title="プロフィール設定"
            >
              {user?.avatar_url && !profileImageError ? (
                <img 
                  src={user.avatar_url} 
                  alt="プロフィール画像" 
                  className="dashboard__user-avatar"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              ) : (
                <span className="dashboard__user-avatar-placeholder">
                  <FaUser className="dashboard__user-avatar-icon" />
                </span>
              )}
              <span>{user?.name}</span>
            </button>
            <button className="dashboard__nav-button dashboard__nav-button--logout tuiz-hover-lift" onClick={handleLogout}>
              <FaSignOutAlt className="dashboard__logout-icon" />
              ログアウト
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="dashboard__content">
          <main className="dashboard__main">
            {/* Quick Actions */}
            <section className="dashboard__quick-actions tuiz-animate-fade-in-up tuiz-animate-stagger-1">
              <div className="dashboard__action-grid">
                <div className="dashboard__action-card tuiz-animate-scale-in tuiz-animate-stagger-1 tuiz-hover-lift" onClick={() => navigate('/create-quiz')}>
                  <div className="dashboard__action-icon dashboard__action-icon--create">
                    <FaPen className="dashboard__action-icon-element tuiz-animate-breathe" />
                  </div>
                  <h3 className="dashboard__action-title">新しいクイズを作成</h3>
                </div>

                <div className="dashboard__action-card tuiz-animate-scale-in tuiz-animate-stagger-2 tuiz-hover-lift" onClick={() => navigate('/join')}>
                  <div className="dashboard__action-icon dashboard__action-icon--join">
                    <FaGamepad className="dashboard__action-icon-element tuiz-animate-breathe" />
                  </div>
                  <h3 className="dashboard__action-title">ゲームに参加</h3>
                </div>

                <div className="dashboard__action-card dashboard__action-card--disabled tuiz-animate-scale-in tuiz-animate-stagger-3">
                  <div className="dashboard__action-icon dashboard__action-icon--analytics">
                    <FaChartBar className="dashboard__action-icon-element" />
                  </div>
                  <h3 className="dashboard__action-title">分析・統計</h3>
                  <div className="dashboard__action-badge dashboard__action-badge--coming-soon">準備中</div>
                </div>

                <div className="dashboard__action-card tuiz-animate-scale-in tuiz-animate-stagger-4 tuiz-hover-lift" onClick={() => navigate('/quiz-library')}>
                  <div className="dashboard__action-icon dashboard__action-icon--library">
                    <FaFolderOpen className="dashboard__action-icon-element tuiz-animate-breathe" />
                  </div>
                  <h3 className="dashboard__action-title">クイズライブラリ</h3>
                </div>
              </div>
            </section>

            {/* Active Session Alert */}
            {activeSession && (
              <section className="dashboard__active-session tuiz-animate-fade-in-up tuiz-animate-stagger-2">
                <div className="dashboard__active-session-card">
                  <div className="dashboard__active-session-content">
                    <div className="dashboard__active-session-info">
                      <div className="dashboard__active-session-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="dashboard__active-session-details">
                        <h3>待機中のゲームセッション</h3>
                        <div>
                          <p><strong>{activeSession.title}</strong></p>
                          <p>ルーム: {activeSession.room}</p>
                          <p>参加者: {activeSession.playerCount}人</p>
                        </div>
                      </div>
                    </div>
                    <div className="dashboard__active-session-actions">
                      <button
                        onClick={handleRejoinSession}
                        className="dashboard__active-session-btn dashboard__active-session-btn--primary tuiz-hover-scale"
                      >
                        セッションに戻る
                      </button>
                      <button
                        onClick={handleDismissSession}
                        className="dashboard__active-session-btn dashboard__active-session-btn--danger tuiz-hover-scale"
                      >
                        セッション終了
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Loading indicator for session check */}
            {checkingSession && (
              <section className="dashboard__session-check tuiz-animate-fade-in-up">
                <div className="dashboard__session-check-card">
                  <div className="dashboard__session-check-content">
                    <div className="dashboard__session-check-spinner tuiz-animate-spin"></div>
                    <span className="dashboard__session-check-text">アクティブなセッションをチェック中...</span>
                  </div>
                </div>
              </section>
            )}

            {/* Search Section */}
            <section className="dashboard__search tuiz-animate-fade-in-up tuiz-animate-stagger-2">
              <div className="dashboard__search-container">
                <div className="dashboard__search-row">
                  <div className="dashboard__search-input-wrapper">
                    <FaSearch className="dashboard__search-icon" />
                    <input
                      className="dashboard__search-input"
                      placeholder="マイセットを検索（タイトル・説明・カテゴリ）"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && console.log('Search triggered')}
                    />
                  </div>
                  <div className="dashboard__search-actions">
                    <button className="dashboard__button dashboard__button--primary tuiz-hover-scale" onClick={() => console.log('Search button clicked')}>
                      <FaSearchPlus className="dashboard__button-icon" /> 検索
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Draft Quizzes Section */}
            {draftQuizzes.length > 0 && (
              <section className="dashboard__drafts tuiz-animate-fade-in-up tuiz-animate-stagger-3">
                <div className="dashboard__section-header">
                  <h2 className="dashboard__section-title">下書きを続ける</h2>
                  <button className="dashboard__section-link tuiz-hover-lift" onClick={() => navigate('/quiz-library?view=drafts')}>
                    すべて表示
                  </button>
                </div>
                <div className="dashboard__horizontal-scroll">
                  <div className="dashboard__horizontal-scroll-content">
                    {draftQuizzes.map((draft) => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        onEdit={handleContinueEditingDraft}
                        onDelete={handleDeleteDraft}
                        isDeleting={deleting}
                        deletingQuizId={deletingQuizId}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Published Quizzes Section */}
            <section className="dashboard__quizzes tuiz-animate-fade-in-up tuiz-animate-stagger-4">
              <div className="dashboard__section-header">
                <h2 className="dashboard__section-title">公開済みクイズセット</h2>
                <button 
                  className="dashboard__section-link tuiz-hover-lift" 
                  onClick={() => navigate('/quiz-library')}
                >
                  クイズライブラリへ
                </button>
              </div>
              
              {loading ? (
                <div className="dashboard__loading">
                  <LoadingSkeleton type="text" count={3} />
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="dashboard__empty-state tuiz-animate-scale-in">
                  <div className="dashboard__empty-icon">
                    <FaPen className="dashboard__empty-icon-element" />
                  </div>
                  <h3 className="dashboard__empty-title">
                    {query ? '検索結果が見つかりません' : 'クイズセットがありません'}
                  </h3>
                  <p className="dashboard__empty-description">
                    {query ? '検索条件を変更してください' : '最初のクイズセットを作成してみましょう！'}
                  </p>
                  {!query && (
                    <button className="dashboard__button dashboard__button--primary tuiz-hover-scale" onClick={() => navigate('/create-quiz')}>
                      <FaPlus className="dashboard__button-icon" />
                      クイズを作成
                    </button>
                  )}
                </div>
              ) : (
                <div className="dashboard__horizontal-scroll">
                  <div className="dashboard__horizontal-scroll-content">
                    {filteredQuizzes.map((quiz) => (
                      <QuizCard
                        key={quiz.id}
                        quiz={quiz}
                        onEdit={handleEditQuiz}
                        onStart={handleStartQuiz}
                        onDelete={handleDeleteQuiz}
                        isDeleting={deleting}
                        deletingQuizId={deletingQuizId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>

        {/* KPI Stats Footer */}
        <section className="dashboard__stats dashboard__stats--footer tuiz-animate-fade-in tuiz-animate-stagger-5">
          <div className="dashboard__stats-grid">
            <Kpi label="公開セット" value={stats.totalQuizSets} sub="あなたの公開中" />
            <Kpi label="下書き" value={stats.draftCount} sub="続きから編集" />
            <Kpi label="累計プレイ" value={stats.totalGames} sub="全クイズの合計" />
            <Kpi 
              label="アカウント作成" 
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '不明'} 
              sub="登録日" 
            />
          </div>
        </section>
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
};

export default Dashboard;
