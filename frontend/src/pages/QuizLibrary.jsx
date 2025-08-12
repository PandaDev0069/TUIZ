import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils/toast';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ConfirmationModal from '../components/ConfirmationModal';
import { useConfirmation } from '../hooks/useConfirmation';
import '../utils/AnimationController'; // Ensure AnimationController is loaded
import '../utils/ViewportFix'; // Ensure ViewportFix is loaded for mobile viewport handling
import CustomDropdown from '../components/ui/CustomDropdown';
import './QuizLibrary.css';

// React Icons
import { 
  FaSearch, 
  FaTh, 
  FaList, 
  FaGlobe,
  FaLock,
  FaEye,
  FaDownload,
  FaPlay,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaBook,
  FaFolderOpen,
  FaSearchMinus,
  FaPen,
  FaClock,
  FaCalendarAlt,
  FaFire,
  FaUser,
  FaStar,
  FaPlus,
  FaSpinner,
  FaFilter,
  FaSort,
  FaChevronDown,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';

// Helper Components
function Badge({ variant = "default", children, className = "" }) {
  return (
    <span className={`quiz-library__badge quiz-library__badge--${variant} ${className}`}>
      {children}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const getDifficultyConfig = (d) => {
    switch (d) {
      case 'easy': return { label: '簡単', variant: 'success' };
      case 'medium': return { label: '普通', variant: 'info' };
      case 'hard': return { label: '難しい', variant: 'warning' };
      case 'expert': return { label: '上級', variant: 'danger' };
      default: return { label: '普通', variant: 'info' };
    }
  };

  const { label, variant } = getDifficultyConfig(difficulty);
  return <Badge variant={variant}>{label}</Badge>;
}

function StatusBadge({ status }) {
  const getStatusConfig = (s) => {
    switch (s) {
      case 'published': return { label: '公開済み', variant: 'success' };
      case 'draft': return { label: '下書き', variant: 'secondary' };
      case 'creating': return { label: '作成中', variant: 'warning' };
      default: return { label: '—', variant: 'secondary' };
    }
  };

  const { label, variant } = getStatusConfig(status);
  return <Badge variant={variant}>{label}</Badge>;
}

function QuizCard({ quiz, tab, onPreview, onClone, onStart, onEdit, onDelete, isCloning = false, cloningQuizId, isDeleting = false, deletingQuizId }) {
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  const handleThumbnailLoad = () => {
    setThumbnailError(false);
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '簡単';
      case 'medium': return '普通';
      case 'hard': return '難しい';
      case 'expert': return '上級';
      default: return '普通';
    }
  };

  const isThisQuizCloning = cloningQuizId === quiz.id;
  const isThisQuizDeleting = deletingQuizId === quiz.id;
  const isLoading = isCloning || isDeleting;

  return (
    <article className="quiz-library__card tuiz-glass-card tuiz-animate-entrance tuiz-hover-lift">
      {/* Thumbnail */}
      {quiz.thumbnail_url && !thumbnailError && (
        <div className="quiz-library__card-thumbnail">
          <img 
            src={quiz.thumbnail_url} 
            alt={`${quiz.title} thumbnail`}
            className="quiz-library__card-thumbnail-image"
            onError={handleThumbnailError}
            onLoad={handleThumbnailLoad}
          />
          <div className="quiz-library__card-overlay"></div>
        </div>
      )}
      
      {/* Header */}
      <header className="quiz-library__card-header">
        <div className="quiz-library__card-meta-top">
          <span className="quiz-library__card-category">
            {quiz.category || "未分類"}
          </span>
          <div className="quiz-library__card-visibility">
            {quiz.is_public ? (
              <FaGlobe className="quiz-library__card-visibility-icon quiz-library__card-visibility-icon--public" />
            ) : (
              <FaLock className="quiz-library__card-visibility-icon quiz-library__card-visibility-icon--private" />
            )}
          </div>
        </div>
        
        <h3 className="quiz-library__card-title">{quiz.title}</h3>
        
        {quiz.description && (
          <p className="quiz-library__card-description">
            {quiz.description}
          </p>
        )}
      </header>

      {/* Content */}
      <div className="quiz-library__card-content">
        <div className="quiz-library__card-badges">
          <DifficultyBadge difficulty={quiz.difficulty_level} />
          {tab === "library" && <StatusBadge status={quiz.status} />}
        </div>
        
        <div className="quiz-library__card-stats">
          <div className="quiz-library__card-stat">
            <FaBook className="quiz-library__card-stat-icon" />
            <span>{quiz.total_questions || 0} 問</span>
          </div>
          <div className="quiz-library__card-stat">
            <FaFire className="quiz-library__card-stat-icon" />
            <span>{quiz.times_played || 0} プレイ</span>
          </div>
          {quiz.users && (
            <div className="quiz-library__card-stat">
              <FaUser className="quiz-library__card-stat-icon" />
              <span>{quiz.users.name}</span>
            </div>
          )}
        </div>

        {quiz.created_at && (
          <div className="quiz-library__card-date">
            <FaCalendarAlt className="quiz-library__card-date-icon" />
            <time dateTime={quiz.created_at}>
              {new Date(quiz.created_at).toLocaleDateString('ja-JP')}
            </time>
          </div>
        )}
      </div>

      {/* Actions */}
      <footer className="quiz-library__card-actions">
        <button 
          className="quiz-library__card-action quiz-library__card-action--secondary"
          onClick={() => onPreview(quiz)}
          disabled={isLoading}
          title="詳細を表示"
        >
          <FaEye className="quiz-library__card-action-icon" />
          <span>詳細</span>
        </button>
        
        {tab === "public" && (
          <button 
            className={`quiz-library__card-action quiz-library__card-action--primary ${
              isThisQuizCloning ? 'quiz-library__card-action--loading' : ''
            }`}
            onClick={() => onClone(quiz)}
            disabled={isLoading}
            title="ライブラリに追加"
          >
            {isThisQuizCloning ? (
              <>
                <FaSpinner className="quiz-library__card-action-icon quiz-library__card-action-icon--spin" />
                <span>追加中...</span>
              </>
            ) : (
              <>
                <FaDownload className="quiz-library__card-action-icon" />
                <span>追加</span>
              </>
            )}
          </button>
        )}
        
        {tab === "library" && (
          <>
            {quiz.status === 'published' && (
              <button 
                className="quiz-library__card-action quiz-library__card-action--success"
                onClick={() => onStart(quiz)}
                disabled={isLoading}
                title="ゲーム開始"
              >
                <FaPlay className="quiz-library__card-action-icon" />
                <span>開始</span>
              </button>
            )}
            
            <button 
              className="quiz-library__card-action quiz-library__card-action--warning"
              onClick={() => onEdit(quiz)}
              disabled={isLoading}
              title="編集"
            >
              <FaEdit className="quiz-library__card-action-icon" />
              <span>編集</span>
            </button>
            
            <button 
              className={`quiz-library__card-action quiz-library__card-action--danger ${
                isThisQuizDeleting ? 'quiz-library__card-action--loading' : ''
              }`}
              onClick={() => onDelete(quiz)}
              disabled={isLoading}
              title="削除"
            >
              {isThisQuizDeleting ? (
                <>
                  <FaSpinner className="quiz-library__card-action-icon quiz-library__card-action-icon--spin" />
                  <span>削除中...</span>
                </>
              ) : (
                <>
                  <FaTrash className="quiz-library__card-action-icon" />
                  <span>削除</span>
                </>
              )}
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

function PreviewModal({ isOpen, quiz, onClose, onClone, onStart, onEdit, onDelete, tab, isCloning = false, cloningQuizId, isDeleting = false, deletingQuizId }) {
  if (!isOpen || !quiz) return null;

  const isThisQuizCloning = cloningQuizId === quiz.id;
  const isThisQuizDeleting = deletingQuizId === quiz.id;
  const isLoading = isCloning || isDeleting;

  return (
    <div className="quiz-library__modal-overlay tuiz-animate-fade-in">
      <div className="quiz-library__modal tuiz-glass-card tuiz-animate-scale-in">
        {/* Header */}
        <header className="quiz-library__modal-header">
          <div className="quiz-library__modal-header-content">
            <h2 className="quiz-library__modal-title">{quiz.title}</h2>
            <div className="quiz-library__modal-meta">
              {tab === "library" && <StatusBadge status={quiz.status} />}
              <DifficultyBadge difficulty={quiz.difficulty_level} />
              {quiz.is_public ? (
                <Badge variant="info">
                  <FaGlobe className="quiz-library__badge-icon" /> 公開
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <FaLock className="quiz-library__badge-icon" /> 非公開
                </Badge>
              )}
              <Badge variant="default">{quiz.total_questions || 0} 問</Badge>
              <div className="quiz-library__modal-stat">
                <FaFire className="quiz-library__modal-stat-icon" />
                <span>{quiz.times_played || 0} プレイ</span>
              </div>
              {quiz.category && <Badge variant="secondary">{quiz.category}</Badge>}
            </div>
          </div>
          <button 
            className="quiz-library__modal-close tuiz-hover-scale"
            onClick={onClose}
            title="閉じる"
          >
            <FaTimes className="quiz-library__modal-close-icon" />
          </button>
        </header>

        {/* Content */}
        <div className="quiz-library__modal-content">
          {quiz.description && (
            <div className="quiz-library__modal-description">
              <h3>説明</h3>
              <p>{quiz.description}</p>
            </div>
          )}

          <div className="quiz-library__modal-details">
            {quiz.users && (
              <div className="quiz-library__modal-detail">
                <FaUser className="quiz-library__modal-detail-icon" />
                <span><strong>作成者:</strong> {quiz.users.name}</span>
              </div>
            )}

            <div className="quiz-library__modal-detail">
              <FaCalendarAlt className="quiz-library__modal-detail-icon" />
              <span><strong>作成日:</strong> {new Date(quiz.created_at).toLocaleDateString('ja-JP')}</span>
            </div>

            <div className="quiz-library__modal-detail">
              <FaClock className="quiz-library__modal-detail-icon" />
              <span><strong>更新日:</strong> {new Date(quiz.updated_at).toLocaleDateString('ja-JP')}</span>
            </div>
          </div>

          {quiz.thumbnail_url && (
            <div className="quiz-library__modal-thumbnail">
              <h3>サムネイル</h3>
              <img 
                src={quiz.thumbnail_url} 
                alt={`${quiz.title} thumbnail`}
                className="quiz-library__modal-thumbnail-image"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <footer className="quiz-library__modal-actions">
          {tab === "public" && (
            <button 
              className={`quiz-library__modal-action quiz-library__modal-action--primary ${
                isThisQuizCloning ? 'quiz-library__modal-action--loading' : ''
              }`}
              onClick={() => onClone(quiz)}
              disabled={isLoading}
            >
              {isThisQuizCloning ? (
                <>
                  <FaSpinner className="quiz-library__modal-action-icon quiz-library__modal-action-icon--spin" />
                  <span>追加中...</span>
                </>
              ) : (
                <>
                  <FaDownload className="quiz-library__modal-action-icon" />
                  <span>ライブラリに追加</span>
                </>
              )}
            </button>
          )}
          
          {tab === "library" && (
            <>
              <button 
                className="quiz-library__modal-action quiz-library__modal-action--warning"
                onClick={() => onEdit(quiz)}
                disabled={isLoading}
              >
                <FaEdit className="quiz-library__modal-action-icon" />
                <span>編集</span>
              </button>
              
              <button 
                className={`quiz-library__modal-action quiz-library__modal-action--danger ${
                  isThisQuizDeleting ? 'quiz-library__modal-action--loading' : ''
                }`}
                onClick={() => onDelete(quiz)}
                disabled={isLoading}
              >
                {isThisQuizDeleting ? (
                  <>
                    <FaSpinner className="quiz-library__modal-action-icon quiz-library__modal-action-icon--spin" />
                    <span>削除中...</span>
                  </>
                ) : (
                  <>
                    <FaTrash className="quiz-library__modal-action-icon" />
                    <span>削除</span>
                  </>
                )}
              </button>
              
              {quiz.status === 'published' && (
                <button 
                  className="quiz-library__modal-action quiz-library__modal-action--success"
                  onClick={() => onStart(quiz)}
                  disabled={isLoading}
                >
                  <FaPlay className="quiz-library__modal-action-icon" />
                  <span>ゲーム開始</span>
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function EmptyState({ tab, query, filterMode }) {
  const getEmptyContent = () => {
    if (query) {
      return {
        title: "検索結果が見つかりません",
        description: "検索条件を変更してもう一度お試しください。",
        icon: <FaSearchMinus className="quiz-library__empty-icon" />
      };
    }
    
    if (tab === "public") {
      return {
        title: "公開クイズが見つかりません",
        description: "フィルターを調整してもう一度お試しください。",
        icon: <FaGlobe className="quiz-library__empty-icon" />
      };
    }
    
    if (filterMode === "drafts") {
      return {
        title: "下書きがありません",
        description: "新しいクイズを作成して下書きに保存してみましょう。",
        icon: <FaPen className="quiz-library__empty-icon" />
      };
    }
    
    if (filterMode === "published") {
      return {
        title: "公開済みクイズがありません",
        description: "下書きを完成させて公開してみましょう。",
        icon: <FaGlobe className="quiz-library__empty-icon" />
      };
    }
    
    return {
      title: "マイライブラリにクイズがありません",
      description: "公開クイズをライブラリに追加するか、新しいクイズを作成してみましょう。",
      icon: <FaBook className="quiz-library__empty-icon" />
    };
  };

  const { title, description, icon } = getEmptyContent();

  return (
    <div className="quiz-library__empty tuiz-animate-scale-in">
      <div className="quiz-library__empty-icon-wrapper">
        {icon}
      </div>
      <h3 className="quiz-library__empty-title">{title}</h3>
      <p className="quiz-library__empty-description">{description}</p>
      {!query && tab === "library" && (
        <button 
          className="quiz-library__empty-action tuiz-button tuiz-button--primary tuiz-hover-scale"
          onClick={() => window.location.href = '/create-quiz'}
        >
          <FaPlus className="quiz-library__empty-action-icon" />
          <span>新しいクイズを作成</span>
        </button>
      )}
    </div>
  );
}

const QuizLibrary = () => {
  const { apiCall } = useAuth();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  // Check URL parameters for initial view
  const urlParams = new URLSearchParams(location.search);
  const initialView = urlParams.get('view');

  // State
  const [tab, setTab] = useState("library"); // library | public
  const [filterMode, setFilterMode] = useState(initialView === 'drafts' ? 'drafts' : 'all'); // all | drafts | published
  const [view, setView] = useState("grid"); // grid | list
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false); // Loading state for cloning
  const [cloningQuizId, setCloningQuizId] = useState(null); // Track which quiz is being cloned
  const [deleting, setDeleting] = useState(false); // Loading state for deleting
  const [deletingQuizId, setDeletingQuizId] = useState(null); // Track which quiz is being deleted
  const [quizzes, setQuizzes] = useState([]);
  const [preview, setPreview] = useState({ open: false, quiz: null });

  // Filters
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    difficulty: "",
    status: ""
  });
  const [sort, setSort] = useState("updated_desc");

  // Constants
  const DIFFICULTY_OPTIONS = [
    { value: "", label: "すべて" },
    { value: "easy", label: "簡単" },
    { value: "medium", label: "普通" },
    { value: "hard", label: "難しい" },
    { value: "expert", label: "上級" },
  ];

  const SORT_OPTIONS = [
    { value: "updated_desc", label: "更新が新しい" },
    { value: "created_desc", label: "作成が新しい" },
    { value: "plays_desc", label: "プレイ回数(多い順)" },
    { value: "questions_desc", label: "問題数(多い順)" },
    { value: "title_asc", label: "タイトル(A→Z)" },
  ];

  // Focus search with / key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch quizzes when tab, filters, sort, or filterMode changes
  useEffect(() => {
    fetchQuizzes();
  }, [tab, filters, sort, query, filterMode]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      
      if (tab === "public") {
        // Fetch public quizzes
        const params = new URLSearchParams({
          search: query,
          category: filters.category,
          difficulty: filters.difficulty,
          sort: sort,
          limit: "50"
        });

        const response = await apiCall(`/quiz/public/browse?${params.toString()}`);
        setQuizzes(response.quizzes || []);
      } else {
        // Fetch user's library (all user's quizzes, same as dashboard)
        const response = await apiCall('/quiz/my-quizzes');
        const allQuizzes = response.quizzes || [];
        
        // Apply filter mode (drafts vs published vs all)
        let libraryQuizzes = allQuizzes;
        if (filterMode === 'drafts') {
          libraryQuizzes = allQuizzes.filter(quiz => 
            quiz.status === 'draft' || quiz.status === 'creating'
          );
        } else if (filterMode === 'published') {
          libraryQuizzes = allQuizzes.filter(quiz => quiz.status === 'published');
        }
        // If filterMode === 'all', show all quizzes (no filtering)
        
        // Apply search
        if (query.trim()) {
          const q = query.toLowerCase();
          libraryQuizzes = libraryQuizzes.filter(quiz => 
            [quiz.title, quiz.description, quiz.category].join(" ").toLowerCase().includes(q)
          );
        }
        
        // Apply filters
        if (filters.difficulty) {
          libraryQuizzes = libraryQuizzes.filter(quiz => quiz.difficulty_level === filters.difficulty);
        }
        if (filters.category) {
          libraryQuizzes = libraryQuizzes.filter(quiz => quiz.category === filters.category);
        }
        
        setQuizzes(libraryQuizzes);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      showError('クイズの取得に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneQuiz = async (quiz) => {
    // Prevent multiple clone requests
    if (cloning || cloningQuizId === quiz.id) {
      return;
    }

    try {
      const confirmed = await showConfirmation({
        title: 'クイズをライブラリに追加',
        message: `"${quiz.title}" をマイライブラリに追加しますか？\n\n画像のコピーに数秒かかる場合があります。`,
        confirmText: '追加する',
        cancelText: 'キャンセル',
        type: 'info'
      });

      if (!confirmed) return;

      setCloning(true);
      setCloningQuizId(quiz.id);

      showSuccess('クイズの追加を開始しました。画像をコピー中...');

      const response = await apiCall(`/quiz/public/clone/${quiz.id}`, {
        method: 'POST'
      });

      showSuccess('クイズがライブラリに追加されました！ダッシュボードにリダイレクトしています...');
      
      // Redirect to dashboard after successful clone
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500); // Wait 1.5 seconds to show the success message
      
    } catch (error) {
      console.error('Error cloning quiz:', error);
      showError('クイズの追加に失敗しました: ' + error.message);
    } finally {
      setCloning(false);
      setCloningQuizId(null);
    }
  };

  const handleStartQuiz = (quiz) => {
    // Navigate to game creation flow
    alert(`ゲーム開始: ${quiz.title}`);
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
          wasPublished: quiz.status === 'published'
        } 
      });
    } catch (error) {
      console.error('Error setting quiz to draft mode:', error);
      showError('編集モードへの変更に失敗しました: ' + error.message);
    }
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
      fetchQuizzes(); // Refresh the quiz list
    } catch (error) {
      console.error('Error deleting quiz set:', error);
      showError('削除に失敗しました: ' + error.message);
    } finally {
      setDeleting(false);
      setDeletingQuizId(null);
    }
  };

  const filteredQuizzes = useMemo(() => {
    if (tab === "public") {
      return quizzes; // Already filtered on server
    }
    
    // Additional client-side filtering for library
    let filtered = [...quizzes];
    
    // Apply sorting for library
    const sortKey = (quiz) => {
      switch (sort) {
        case "created_desc":
          return -new Date(quiz.created_at).getTime();
        case "plays_desc":
          return -(quiz.times_played || 0);
        case "questions_desc":
          return -(quiz.total_questions || 0);
        case "title_asc":
          return quiz.title.toLowerCase();
        case "updated_desc":
        default:
          return -new Date(quiz.updated_at).getTime();
      }
    };

    filtered.sort((a, b) => {
      const aKey = sortKey(a);
      const bKey = sortKey(b);
      if (typeof aKey === "string") return aKey.localeCompare(bKey);
      return aKey - bKey;
    });

    return filtered;
  }, [quizzes, sort, tab]);

  // Separate quizzes by status for My Library
  const groupedQuizzes = useMemo(() => {
    if (tab !== "library") {
      return { published: filteredQuizzes, draft: [] };
    }

    const published = filteredQuizzes.filter(quiz => quiz.status === 'published');
    const draft = filteredQuizzes.filter(quiz => quiz.status === 'draft' || quiz.status === 'creating');

    return { published, draft };
  }, [filteredQuizzes, tab]);

  return (
    <div className="quiz-library tuiz-page-container tuiz-animate-fade-in">
      {/* Back Button */}
      <button 
        className="quiz-library__back-button tuiz-animate-slide-in-left"
        onClick={() => navigate('/dashboard')}
        title="ダッシュボードに戻る"
      >
        <FaArrowLeft className="quiz-library__back-button-icon" />
        <span className="quiz-library__back-button-text">ダッシュボード</span>
      </button>

      {/* Header */}
      <header className="quiz-library__header tuiz-animate-slide-in-down">
        <div className="quiz-library__header-content">
          <div className="quiz-library__header-left">
            <div className="quiz-library__title-section">
              <h1 className="quiz-library__title">
                <FaFolderOpen className="quiz-library__title-icon" />
                <span>クイズライブラリ</span>
              </h1>
              <p className="quiz-library__subtitle">
                公開クイズを探索してライブラリに追加
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="quiz-library__tabs">
          <button 
            className={`quiz-library__tab quiz-library__tab--my-library ${tab === "library" ? "quiz-library__tab--active" : ""}`}
            onClick={() => setTab("library")}
          >
            <FaBook className="quiz-library__tab-icon" />
            <span>マイライブラリ</span>
          </button>
          <button 
            className={`quiz-library__tab quiz-library__tab--public ${tab === "public" ? "quiz-library__tab--active" : ""}`}
            onClick={() => setTab("public")}
          >
            <FaGlobe className="quiz-library__tab-icon" />
            <span>公開クイズを探す</span>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="quiz-library__main">
        {/* Toolbar */}
        <div className="quiz-library__toolbar tuiz-animate-slide-in-up tuiz-animate-stagger-1">
          <div className="quiz-library__toolbar-left">
            {/* Search */}
            <div className="quiz-library__search">
              <FaSearch className="quiz-library__search-icon" />
              <input
                ref={searchRef}
                className="quiz-library__search-input"
                placeholder="検索（タイトル・説明・カテゴリ） / Press / to focus"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Filter buttons for library tab */}
            {tab === "library" && (
              <div className="quiz-library__filter-tabs">
                <button 
                  className={`quiz-library__filter-tab ${filterMode === "all" ? "quiz-library__filter-tab--active" : ""}`}
                  onClick={() => setFilterMode("all")}
                >
                  すべて
                </button>
                <button 
                  className={`quiz-library__filter-tab ${filterMode === "published" ? "quiz-library__filter-tab--active" : ""}`}
                  onClick={() => setFilterMode("published")}
                >
                  公開済み
                </button>
                <button 
                  className={`quiz-library__filter-tab ${filterMode === "drafts" ? "quiz-library__filter-tab--active" : ""}`}
                  onClick={() => setFilterMode("drafts")}
                >
                  下書き
                </button>
              </div>
            )}
            
            <div className="quiz-library__toolbar-center">
              {/* Difficulty Filter */}
              <CustomDropdown
                value={filters.difficulty}
                onChange={(value) => setFilters(prev => ({ ...prev, difficulty: value }))}
                options={DIFFICULTY_OPTIONS}
                icon={FaFilter}
                placeholder="All Difficulties"
              />
              
              {/* Sort Options */}
              <CustomDropdown
                value={sort}
                onChange={(value) => setSort(value)}
                options={SORT_OPTIONS}
                icon={FaSort}
                placeholder="Sort by"
              />
            </div>
          </div>

          <div className="quiz-library__toolbar-right">
            {/* View Toggle */}
            <div className="quiz-library__view-toggle">
              <button 
                className={`quiz-library__view-button ${view === "grid" ? "quiz-library__view-button--active" : ""}`}
                onClick={() => setView("grid")}
                title="グリッド表示"
              >
                <FaTh className="quiz-library__view-button-icon" />
              </button>
              <button 
                className={`quiz-library__view-button ${view === "list" ? "quiz-library__view-button--active" : ""}`}
                onClick={() => setView("list")}
                title="リスト表示"
              >
                <FaList className="quiz-library__view-button-icon" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="quiz-library__content-wrapper">
          {loading ? (
            <div className="quiz-library__loading tuiz-animate-scale-in">
              <LoadingSkeleton type="text" count={3} />
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <EmptyState tab={tab} query={query} filterMode={filterMode} />
          ) : (
            <div className={`quiz-library__content tuiz-animate-fade-in-up tuiz-animate-stagger-2 ${view === "list" ? "quiz-library__content--list" : "quiz-library__content--grid"}`}>
              {tab === "library" ? (
                // Grouped view for My Library
                <div className="quiz-library__sections">
                  {groupedQuizzes.published.length > 0 && (
                    <section className="quiz-library__section tuiz-animate-slide-in-up tuiz-animate-stagger-3">
                      <h2 className="quiz-library__section-title">
                        <FaStar className="quiz-library__section-title-icon" />
                        公開済みクイズ ({groupedQuizzes.published.length})
                      </h2>
                      {view === "grid" ? (
                        <div className="quiz-library__grid">
                          {groupedQuizzes.published.map((quiz, index) => (
                            <div 
                              key={quiz.id} 
                              className="tuiz-animate-stagger-4"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <QuizCard
                                quiz={quiz}
                                tab={tab}
                                onPreview={(quiz) => setPreview({ open: true, quiz })}
                                onClone={handleCloneQuiz}
                                onStart={handleStartQuiz}
                                onEdit={handleEditQuiz}
                                onDelete={handleDeleteQuiz}
                                isCloning={cloning}
                                cloningQuizId={cloningQuizId}
                                isDeleting={deleting}
                                deletingQuizId={deletingQuizId}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="quiz-library__list">
                          <div className="quiz-library__list-header">
                            <div className="quiz-library__list-column">タイトル</div>
                            <div className="quiz-library__list-column">難易度</div>
                            <div className="quiz-library__list-column">問題数</div>
                            <div className="quiz-library__list-column">プレイ</div>
                            <div className="quiz-library__list-column">更新日</div>
                            <div className="quiz-library__list-column">操作</div>
                          </div>
                          {groupedQuizzes.published.map((quiz, index) => (
                            <div 
                              key={quiz.id} 
                              className="quiz-library__list-row tuiz-animate-slide-in-left"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="quiz-library__list-cell">
                                <div className="quiz-library__list-title">{quiz.title}</div>
                              </div>
                              <div className="quiz-library__list-cell">
                                <DifficultyBadge difficulty={quiz.difficulty_level} />
                              </div>
                              <div className="quiz-library__list-cell">{quiz.total_questions || 0}</div>
                              <div className="quiz-library__list-cell">{quiz.times_played || 0}</div>
                              <div className="quiz-library__list-cell">
                                {new Date(quiz.updated_at).toLocaleDateString('ja-JP')}
                              </div>
                              <div className="quiz-library__list-cell">
                                <div className="quiz-library__list-actions">
                                  <button 
                                    className="quiz-library__list-action quiz-library__list-action--secondary"
                                    onClick={() => setPreview({ open: true, quiz })}
                                  >
                                    詳細
                                  </button>
                                  <button 
                                    className="quiz-library__list-action quiz-library__list-action--primary"
                                    onClick={() => handleStartQuiz(quiz)}
                                  >
                                    開始
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {groupedQuizzes.draft.length > 0 && (
                    <section className="quiz-library__section tuiz-animate-slide-in-up tuiz-animate-stagger-3">
                      <h2 className="quiz-library__section-title">
                        <FaPen className="quiz-library__section-title-icon" />
                        下書き ({groupedQuizzes.draft.length})
                      </h2>
                      {view === "grid" ? (
                        <div className="quiz-library__grid">
                          {groupedQuizzes.draft.map((quiz, index) => (
                            <div 
                              key={quiz.id} 
                              className="tuiz-animate-stagger-4"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <QuizCard
                                quiz={quiz}
                                tab={tab}
                                onPreview={(quiz) => setPreview({ open: true, quiz })}
                                onClone={handleCloneQuiz}
                                onStart={handleStartQuiz}
                                onEdit={handleEditQuiz}
                                onDelete={handleDeleteQuiz}
                                isCloning={cloning}
                                cloningQuizId={cloningQuizId}
                                isDeleting={deleting}
                                deletingQuizId={deletingQuizId}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="quiz-library__list">
                          <div className="quiz-library__list-header">
                            <div className="quiz-library__list-column">タイトル</div>
                            <div className="quiz-library__list-column">難易度</div>
                            <div className="quiz-library__list-column">問題数</div>
                            <div className="quiz-library__list-column">プレイ</div>
                            <div className="quiz-library__list-column">更新日</div>
                            <div className="quiz-library__list-column">操作</div>
                          </div>
                          {groupedQuizzes.draft.map((quiz, index) => (
                            <div 
                              key={quiz.id} 
                              className="quiz-library__list-row tuiz-animate-slide-in-left"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="quiz-library__list-cell">
                                <div className="quiz-library__list-title">{quiz.title}</div>
                              </div>
                              <div className="quiz-library__list-cell">
                                <DifficultyBadge difficulty={quiz.difficulty_level} />
                              </div>
                              <div className="quiz-library__list-cell">{quiz.total_questions || 0}</div>
                              <div className="quiz-library__list-cell">{quiz.times_played || 0}</div>
                              <div className="quiz-library__list-cell">
                                {new Date(quiz.updated_at).toLocaleDateString('ja-JP')}
                              </div>
                              <div className="quiz-library__list-cell">
                                <div className="quiz-library__list-actions">
                                  <button 
                                    className="quiz-library__list-action quiz-library__list-action--secondary"
                                    onClick={() => setPreview({ open: true, quiz })}
                                  >
                                    詳細
                                  </button>
                                  <button 
                                    className="quiz-library__list-action quiz-library__list-action--warning"
                                    onClick={() => handleEditQuiz(quiz)}
                                  >
                                    編集
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {groupedQuizzes.published.length === 0 && groupedQuizzes.draft.length === 0 && (
                    <EmptyState tab={tab} query={query} filterMode={filterMode} />
                  )}
                </div>
              ) : (
                // Original view for Public Browse
                <>
                  {view === "grid" ? (
                    <div className="quiz-library__grid">
                      {filteredQuizzes.map((quiz, index) => (
                        <div 
                          key={quiz.id} 
                          className="tuiz-animate-stagger-4"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <QuizCard
                            quiz={quiz}
                            tab={tab}
                            onPreview={(quiz) => setPreview({ open: true, quiz })}
                            onClone={handleCloneQuiz}
                            onStart={handleStartQuiz}
                            onEdit={handleEditQuiz}
                            onDelete={handleDeleteQuiz}
                            isCloning={cloning}
                            cloningQuizId={cloningQuizId}
                            isDeleting={deleting}
                            deletingQuizId={deletingQuizId}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="quiz-library__list">
                      <div className="quiz-library__list-header">
                        <div className="quiz-library__list-column">タイトル</div>
                        <div className="quiz-library__list-column">難易度</div>
                        <div className="quiz-library__list-column">問題数</div>
                        <div className="quiz-library__list-column">プレイ</div>
                        <div className="quiz-library__list-column">更新日</div>
                        <div className="quiz-library__list-column">操作</div>
                      </div>
                      {filteredQuizzes.map((quiz, index) => (
                        <div 
                          key={quiz.id} 
                          className="quiz-library__list-row tuiz-animate-slide-in-left"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="quiz-library__list-cell">
                            <div className="quiz-library__list-title">{quiz.title}</div>
                          </div>
                          <div className="quiz-library__list-cell">
                            <DifficultyBadge difficulty={quiz.difficulty_level} />
                          </div>
                          <div className="quiz-library__list-cell">{quiz.total_questions || 0}</div>
                          <div className="quiz-library__list-cell">{quiz.times_played || 0}</div>
                          <div className="quiz-library__list-cell">
                            {new Date(quiz.updated_at).toLocaleDateString('ja-JP')}
                          </div>
                          <div className="quiz-library__list-cell">
                            <div className="quiz-library__list-actions">
                              <button 
                                className="quiz-library__list-action quiz-library__list-action--secondary"
                                onClick={() => setPreview({ open: true, quiz })}
                              >
                                詳細
                              </button>
                              <button 
                                className="quiz-library__list-action quiz-library__list-action--primary"
                                onClick={() => handleCloneQuiz(quiz)}
                              >
                                追加
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={preview.open}
        quiz={preview.quiz}
        onClose={() => setPreview({ open: false, quiz: null })}
        onClone={handleCloneQuiz}
        onStart={handleStartQuiz}
        onEdit={handleEditQuiz}
        onDelete={handleDeleteQuiz}
        tab={tab}
        isCloning={cloning}
        cloningQuizId={cloningQuizId}
        isDeleting={deleting}
        deletingQuizId={deletingQuizId}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal {...confirmationProps} />
    </div>
  );
};

export default QuizLibrary;
