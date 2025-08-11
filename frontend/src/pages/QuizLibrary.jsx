import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils/toast';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ConfirmationModal from '../components/ConfirmationModal';
import { useConfirmation } from '../hooks/useConfirmation';
import './QuizLibrary.css';
import './dashboard.css'; // Import Dashboard styles for My Library cards

// Lucide Icons
import { 
  Search, 
  Grid3X3, 
  List, 
  Globe,
  GlobeLock,
  Eye,
  Download,
  Play,
  ArrowLeft,
  Edit,
  Trash2,
  X,
  Book,
  FolderOpen,
  SearchX,
  PenTool
} from 'lucide-react';

// Helper Components
function Badge({ tone = "slate", children, useDashboardStyle = false }) {
  if (useDashboardStyle) {
    // Use Dashboard badge styling
    return <span className={`dashboard__badge dashboard__badge--${tone}`}>{children}</span>;
  }
  
  // Use Quiz Library badge styling
  const toneClasses = {
    slate: "quiz-library__badge--slate",
    green: "quiz-library__badge--green",
    amber: "quiz-library__badge--amber",
    blue: "quiz-library__badge--blue",
    rose: "quiz-library__badge--rose",
    violet: "quiz-library__badge--violet",
  };
  
  return (
    <span className={`quiz-library__badge ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const getDifficultyLabel = (d) => {
    switch (d) {
      case 'easy': return { label: '簡単', tone: 'green' };
      case 'medium': return { label: '普通', tone: 'blue' };
      case 'hard': return { label: '難しい', tone: 'amber' };
      case 'expert': return { label: '上級', tone: 'violet' };
      default: return { label: '普通', tone: 'blue' };
    }
  };

  const { label, tone } = getDifficultyLabel(difficulty);
  return <Badge tone={tone}>{label}</Badge>;
}

function StatusBadge({ status }) {
  const getStatusLabel = (s) => {
    switch (s) {
      case 'published': return { label: '公開済み', tone: 'green' };
      case 'draft': return { label: '下書き', tone: 'slate' };
      case 'creating': return { label: '作成中', tone: 'amber' };
      default: return { label: '—', tone: 'slate' };
    }
  };

  const { label, tone } = getStatusLabel(status);
  return <Badge tone={tone}>{label}</Badge>;
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

  // Use Dashboard-style design for "My Library" tab
  if (tab === "library") {
    return (
      <div className="dashboard__quiz-card">
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
            {quiz.is_public ? <Globe size={14} /> : <GlobeLock size={14} />}
            <span>{quiz.is_public ? '公開' : '非公開'}</span>
          </div>
          <div className="dashboard__quiz-card-meta">
            <div className="dashboard__quiz-card-category">{quiz.category || "未分類"}</div>
            <div className="dashboard__quiz-card-date">作成日 {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString('ja-JP') : '不明'}</div>
            <h3 className="dashboard__quiz-card-title">{quiz.title}</h3>
            <p className="dashboard__quiz-card-description">{quiz.description || "説明なし"}</p>
            <div className="dashboard__quiz-card-badges">
              <Badge tone="blue" useDashboardStyle={true}>{getDifficultyLabel(quiz.difficulty_level)}</Badge>
              <Badge tone="green" useDashboardStyle={true}>{quiz.total_questions || 0} 問</Badge>
              <span className="dashboard__quiz-card-plays">プレイ {quiz.times_played || 0}</span>
            </div>
          </div>
        </div>
        <div className="dashboard__quiz-card-actions">
          <button 
            className="dashboard__button dashboard__button--primary" 
            onClick={() => onPreview(quiz)}
            disabled={isLoading}
          >
            <Eye size={16} /> 詳細
          </button>
          {quiz.status === 'published' && (
            <button 
              className="dashboard__button dashboard__button--secondary" 
              onClick={() => onStart(quiz)}
              disabled={isLoading}
            >
              <Play size={16} /> ゲーム開始
            </button>
          )}
        </div>
      </div>
    );
  }

  // Original Quiz Library design for "Public Browse" tab
  return (
    <div className="quiz-library__card">
      {quiz.thumbnail_url && !thumbnailError && (
        <div className="quiz-library__card-thumbnail">
          <img 
            src={quiz.thumbnail_url} 
            alt={`${quiz.title} thumbnail`}
            className="quiz-library__card-thumbnail-image"
            onError={handleThumbnailError}
            onLoad={handleThumbnailLoad}
          />
        </div>
      )}
      
      <div className="quiz-library__card-content">
        <div className="quiz-library__card-header">
          <div className="quiz-library__card-category">
            {quiz.category || "未分類"}
          </div>
          <h3 className="quiz-library__card-title">{quiz.title}</h3>
          <p className="quiz-library__card-description">
            {quiz.description || "説明なし"}
          </p>
        </div>

        <div className="quiz-library__card-meta">
          <div className="quiz-library__card-badges">
            <DifficultyBadge difficulty={quiz.difficulty_level} />
            {quiz.is_public ? (
              <Badge tone="blue"><Globe size={12} /> 公開</Badge>
            ) : (
              <Badge tone="slate"><GlobeLock size={12} /> 非公開</Badge>
            )}
          </div>
          
          <div className="quiz-library__card-stats">
            <span className="quiz-library__card-stat">
              問題数: {quiz.total_questions || 0}
            </span>
            <span className="quiz-library__card-stat">
              プレイ: {quiz.times_played || 0}
            </span>
            {quiz.users && (
              <span className="quiz-library__card-author">
                作成者: {quiz.users.name}
              </span>
            )}
          </div>
        </div>

        <div className="quiz-library__card-actions">
          <button 
            className="quiz-library__button quiz-library__button--secondary"
            onClick={() => onPreview(quiz)}
            disabled={isLoading}
          >
            <Eye size={16} /> 詳細
          </button>
          
          <button 
            className={`quiz-library__button quiz-library__button--primary ${isThisQuizCloning ? 'quiz-library__button--loading' : ''}`}
            onClick={() => onClone(quiz)}
            disabled={isLoading}
          >
            {isThisQuizCloning ? (
              <>
                <div className="quiz-library__loading-spinner"></div>
                追加中...
              </>
            ) : (
              <>
                <Download size={16} /> ライブラリに追加
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ isOpen, quiz, onClose, onClone, onStart, onEdit, onDelete, tab, isCloning = false, cloningQuizId, isDeleting = false, deletingQuizId }) {
  if (!isOpen || !quiz) return null;

  const isThisQuizCloning = cloningQuizId === quiz.id;
  const isThisQuizDeleting = deletingQuizId === quiz.id;
  const isLoading = isCloning || isDeleting;

  return (
    <div className="quiz-library__modal-overlay">
      <div className="quiz-library__modal">
        <div className="quiz-library__modal-header">
          <div>
            <h3 className="quiz-library__modal-title">{quiz.title}</h3>
            <div className="quiz-library__modal-meta">
              {tab === "library" && <StatusBadge status={quiz.status} />}
              <DifficultyBadge difficulty={quiz.difficulty_level} />
              {quiz.is_public ? (
                <Badge tone="blue"><Globe size={12} /> 公開</Badge>
              ) : (
                <Badge tone="slate"><GlobeLock size={12} /> 非公開</Badge>
              )}
              <span>問題数: {quiz.total_questions || 0}</span>
              <span>プレイ: {quiz.times_played || 0}</span>
              {quiz.category && <Badge>{quiz.category}</Badge>}
            </div>
          </div>
          <button 
            className="quiz-library__modal-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="quiz-library__modal-content">
          <p className="quiz-library__modal-description">
            {quiz.description || "説明なし"}
          </p>

          {quiz.users && (
            <div className="quiz-library__modal-author">
              <strong>作成者:</strong> {quiz.users.name}
            </div>
          )}

          <div className="quiz-library__modal-dates">
            <div><strong>作成日:</strong> {new Date(quiz.created_at).toLocaleDateString('ja-JP')}</div>
            <div><strong>更新日:</strong> {new Date(quiz.updated_at).toLocaleDateString('ja-JP')}</div>
          </div>

          {quiz.thumbnail_url && (
            <div className="quiz-library__modal-thumbnail">
              <img 
                src={quiz.thumbnail_url} 
                alt={`${quiz.title} thumbnail`}
                className="quiz-library__modal-thumbnail-image"
              />
            </div>
          )}
        </div>

        <div className="quiz-library__modal-actions">
          {tab === "public" && (
            <button 
              className={`quiz-library__button quiz-library__button--secondary ${isThisQuizCloning ? 'quiz-library__button--loading' : ''}`}
              onClick={() => onClone(quiz)}
              disabled={isLoading}
            >
              {isThisQuizCloning ? (
                <>
                  <div className="quiz-library__loading-spinner"></div>
                  追加中...
                </>
              ) : (
                <>
                  <Download size={16} /> ライブラリに追加
                </>
              )}
            </button>
          )}
          {tab === "library" && (
            <>
              <button 
                className="quiz-library__button quiz-library__button--secondary"
                onClick={() => onEdit(quiz)}
                disabled={isLoading}
              >
                <Edit size={16} /> 編集
              </button>
              <button 
                className={`quiz-library__button quiz-library__button--danger ${isThisQuizDeleting ? 'quiz-library__button--loading' : ''}`}
                onClick={() => onDelete(quiz)}
                disabled={isLoading}
              >
                {isThisQuizDeleting ? (
                  <>
                    <div className="quiz-library__loading-spinner"></div>
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> 削除
                  </>
                )}
              </button>
              <button 
                className="quiz-library__button quiz-library__button--primary"
                onClick={() => onStart(quiz)}
                disabled={isLoading}
              >
                <Play size={16} /> ゲーム開始
              </button>
            </>
          )}
        </div>
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
        icon: <SearchX size={48} />
      };
    }
    
    if (tab === "public") {
      return {
        title: "公開クイズが見つかりません",
        description: "フィルターを調整してもう一度お試しください。",
        icon: <Globe size={48} />
      };
    }
    
    if (filterMode === "drafts") {
      return {
        title: "下書きがありません",
        description: "新しいクイズを作成して下書きに保存してみましょう。",
        icon: <PenTool size={48} />
      };
    }
    
    if (filterMode === "published") {
      return {
        title: "公開済みクイズがありません",
        description: "下書きを完成させて公開してみましょう。",
        icon: <Globe size={48} />
      };
    }
    
    return {
      title: "マイライブラリにクイズがありません",
      description: "公開クイズをライブラリに追加するか、新しいクイズを作成してみましょう。",
      icon: <Book size={48} />
    };
  };

  const { title, description, icon } = getEmptyContent();

  return (
    <div className="quiz-library__empty">
      <div className="quiz-library__empty-icon">{icon}</div>
      <h3 className="quiz-library__empty-title">{title}</h3>
      <p className="quiz-library__empty-description">{description}</p>
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
    <div className="quiz-library">
      {/* Back Button */}
      <button 
        className="quiz-library__back-button"
        onClick={() => navigate('/dashboard')}
        title="ダッシュボードに戻る"
      >
        <ArrowLeft size={20} />
        <span>ダッシュボード</span>
      </button>

      {/* Header */}
      <header className="quiz-library__header">
        <div className="quiz-library__header-content">
          <div className="quiz-library__header-left">
            <div className="quiz-library__title-section">
              <h1 className="quiz-library__title">
                <FolderOpen size={24} style={{ display: 'inline', marginRight: '8px' }} />
                クイズライブラリ
              </h1>
              <p className="quiz-library__subtitle">
                公開クイズを探索してライブラリに追加
              </p>
            </div>
          </div>
          
          <div className="quiz-library__tabs">
            <button 
              className={`quiz-library__tab ${tab === "library" ? "quiz-library__tab--active" : ""}`}
              onClick={() => setTab("library")}
            >
              マイライブラリ
            </button>
            <button 
              className={`quiz-library__tab ${tab === "public" ? "quiz-library__tab--active" : ""}`}
              onClick={() => setTab("public")}
            >
              公開クイズを探す
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="quiz-library__main">
        {/* Toolbar */}
        <div className="quiz-library__toolbar">
          <div className="quiz-library__toolbar-left">
            <div className="quiz-library__search">
              <Search size={16} className="quiz-library__search-icon" />
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
            
            <select
              className="quiz-library__select"
              value={filters.difficulty}
              onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            >
              {DIFFICULTY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  難易度: {option.label}
                </option>
              ))}
            </select>
            
            <select
              className="quiz-library__select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  並び替え: {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="quiz-library__toolbar-right">
            <div className="quiz-library__view-toggle">
              <button 
                className={`quiz-library__view-button ${view === "grid" ? "quiz-library__view-button--active" : ""}`}
                onClick={() => setView("grid")}
              >
                <Grid3X3 size={16} />
              </button>
              <button 
                className={`quiz-library__view-button ${view === "list" ? "quiz-library__view-button--active" : ""}`}
                onClick={() => setView("list")}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="quiz-library__loading">
            <LoadingSkeleton type="text" count={3} />
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <EmptyState tab={tab} query={query} filterMode={filterMode} />
        ) : (
          <div className={`quiz-library__content ${view === "list" ? "quiz-library__content--list" : ""}`}>
            {tab === "library" ? (
              // Grouped view for My Library
              <div>
                {groupedQuizzes.published.length > 0 && (
                  <div className="quiz-library__section">
                    <h2 className="quiz-library__section-title">公開済みクイズ ({groupedQuizzes.published.length})</h2>
                    {view === "grid" ? (
                      <div className="quiz-library__grid">
                        {groupedQuizzes.published.map(quiz => (
                          <QuizCard
                            key={quiz.id}
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
                        {groupedQuizzes.published.map(quiz => (
                          <div key={quiz.id} className="quiz-library__list-row">
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
                                  className="quiz-library__button quiz-library__button--small"
                                  onClick={() => setPreview({ open: true, quiz })}
                                >
                                  詳細
                                </button>
                                <button 
                                  className="quiz-library__button quiz-library__button--small quiz-library__button--primary"
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
                  </div>
                )}

                {groupedQuizzes.draft.length > 0 && (
                  <div className="quiz-library__section">
                    <h2 className="quiz-library__section-title">下書き ({groupedQuizzes.draft.length})</h2>
                    {view === "grid" ? (
                      <div className="quiz-library__grid">
                        {groupedQuizzes.draft.map(quiz => (
                          <QuizCard
                            key={quiz.id}
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
                        {groupedQuizzes.draft.map(quiz => (
                          <div key={quiz.id} className="quiz-library__list-row">
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
                                  className="quiz-library__button quiz-library__button--small"
                                  onClick={() => setPreview({ open: true, quiz })}
                                >
                                  詳細
                                </button>
                                {/* No start button for drafts */}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                    {filteredQuizzes.map(quiz => (
                      <QuizCard
                        key={quiz.id}
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
                    ))}
                  </div>
                ) : (
                  <div className="quiz-library__list">
                    {/* List view implementation */}
                    <div className="quiz-library__list-header">
                      <div className="quiz-library__list-column">タイトル</div>
                      <div className="quiz-library__list-column">難易度</div>
                      <div className="quiz-library__list-column">問題数</div>
                      <div className="quiz-library__list-column">プレイ</div>
                      <div className="quiz-library__list-column">更新日</div>
                      <div className="quiz-library__list-column">操作</div>
                    </div>
                    {filteredQuizzes.map(quiz => (
                      <div key={quiz.id} className="quiz-library__list-row">
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
                              className="quiz-library__button quiz-library__button--small"
                              onClick={() => setPreview({ open: true, quiz })}
                            >
                              詳細
                            </button>
                            <button 
                              className="quiz-library__button quiz-library__button--small quiz-library__button--primary"
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
