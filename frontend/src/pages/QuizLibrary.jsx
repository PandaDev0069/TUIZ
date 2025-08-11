import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils/toast';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ConfirmationModal from '../components/ConfirmationModal';
import { useConfirmation } from '../hooks/useConfirmation';
import './QuizLibrary.css';

// Lucide Icons
import { 
  Search, 
  Grid3X3, 
  List, 
  Globe,
  GlobeLock,
  Plus,
  Eye,
  Download,
  Play,
  Filter,
  SortAsc,
  ArrowLeft
} from 'lucide-react';

// Helper Components
function Badge({ tone = "slate", children }) {
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
      case 'published': return { label: '公開', tone: 'green' };
      case 'draft': return { label: '下書き', tone: 'slate' };
      case 'creating': return { label: '作成中', tone: 'amber' };
      default: return { label: '—', tone: 'slate' };
    }
  };

  const { label, tone } = getStatusLabel(status);
  return <Badge tone={tone}>{label}</Badge>;
}

function QuizCard({ quiz, tab, onPreview, onClone, onStart }) {
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  const handleThumbnailLoad = () => {
    setThumbnailError(false);
  };

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
            <StatusBadge status={quiz.status} />
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
          >
            <Eye size={16} /> 詳細
          </button>
          
          {tab === "public" ? (
            <button 
              className="quiz-library__button quiz-library__button--primary"
              onClick={() => onClone(quiz)}
            >
              <Download size={16} /> ライブラリに追加
            </button>
          ) : (
            <button 
              className="quiz-library__button quiz-library__button--primary"
              onClick={() => onStart(quiz)}
            >
              <Play size={16} /> ゲーム開始
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ isOpen, quiz, onClose, onClone, onStart, tab }) {
  if (!isOpen || !quiz) return null;

  return (
    <div className="quiz-library__modal-overlay">
      <div className="quiz-library__modal">
        <div className="quiz-library__modal-header">
          <div>
            <h3 className="quiz-library__modal-title">{quiz.title}</h3>
            <div className="quiz-library__modal-meta">
              <StatusBadge status={quiz.status} />
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
            ✕
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
              className="quiz-library__button quiz-library__button--secondary"
              onClick={() => onClone(quiz)}
            >
              <Download size={16} /> ライブラリに追加
            </button>
          )}
          <button 
            className="quiz-library__button quiz-library__button--primary"
            onClick={() => onStart(quiz)}
          >
            <Play size={16} /> ゲーム開始
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab, query }) {
  const getEmptyContent = () => {
    if (query) {
      return {
        title: "検索結果が見つかりません",
        description: "検索条件を変更してもう一度お試しください。",
        emoji: "🔍"
      };
    }
    
    if (tab === "public") {
      return {
        title: "公開クイズが見つかりません",
        description: "フィルターを調整してもう一度お試しください。",
        emoji: "🌐"
      };
    }
    
    return {
      title: "マイライブラリにクイズがありません",
      description: "公開クイズをライブラリに追加してみましょう。",
      emoji: "📚"
    };
  };

  const { title, description, emoji } = getEmptyContent();

  return (
    <div className="quiz-library__empty">
      <div className="quiz-library__empty-icon">{emoji}</div>
      <h3 className="quiz-library__empty-title">{title}</h3>
      <p className="quiz-library__empty-description">{description}</p>
    </div>
  );
}

const QuizLibrary = () => {
  const { apiCall } = useAuth();
  const { showConfirmation, confirmationProps } = useConfirmation();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // State
  const [tab, setTab] = useState("public"); // public | library
  const [view, setView] = useState("grid"); // grid | list
  const [loading, setLoading] = useState(false);
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

  // Fetch quizzes when tab, filters, or sort changes
  useEffect(() => {
    fetchQuizzes();
  }, [tab, filters, sort, query]);

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
        
        // Show all user's quizzes (not just cloned ones)
        let libraryQuizzes = allQuizzes;
        
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
    try {
      const confirmed = await showConfirmation({
        title: 'クイズをライブラリに追加',
        message: `"${quiz.title}" をマイライブラリに追加しますか？`,
        confirmText: '追加する',
        cancelText: 'キャンセル',
        type: 'info'
      });

      if (!confirmed) return;

      const response = await apiCall(`/quiz/public/clone/${quiz.id}`, {
        method: 'POST'
      });

      showSuccess('クイズがライブラリに追加されました！');
      
      // Redirect to dashboard after successful clone
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000); // Wait 1 second to show the success message
      
    } catch (error) {
      console.error('Error cloning quiz:', error);
      showError('クイズの追加に失敗しました: ' + error.message);
    }
  };

  const handleStartQuiz = (quiz) => {
    // Navigate to game creation flow
    alert(`ゲーム開始: ${quiz.title}`);
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

  return (
    <div className="quiz-library">
      {/* Header */}
      <header className="quiz-library__header">
        <div className="quiz-library__header-content">
          <div className="quiz-library__header-left">
            <button 
              className="quiz-library__back-btn"
              onClick={() => navigate('/dashboard')}
              title="ダッシュボードに戻る"
            >
              <ArrowLeft size={16} />
              ダッシュボード
            </button>
            <div className="quiz-library__title-section">
              <h1 className="quiz-library__title">📚 クイズライブラリ</h1>
              <p className="quiz-library__subtitle">
                公開クイズを探索してライブラリに追加
              </p>
            </div>
          </div>
          
          <div className="quiz-library__tabs">
            <button 
              className={`quiz-library__tab ${tab === "public" ? "quiz-library__tab--active" : ""}`}
              onClick={() => setTab("public")}
            >
              公開クイズを探す
            </button>
            <button 
              className={`quiz-library__tab ${tab === "library" ? "quiz-library__tab--active" : ""}`}
              onClick={() => setTab("library")}
            >
              マイライブラリ
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
          <EmptyState tab={tab} query={query} />
        ) : (
          <div className={`quiz-library__content ${view === "list" ? "quiz-library__content--list" : ""}`}>
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
                      <div className="quiz-library__list-description">{quiz.description}</div>
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
                        {tab === "public" ? (
                          <button 
                            className="quiz-library__button quiz-library__button--small quiz-library__button--primary"
                            onClick={() => handleCloneQuiz(quiz)}
                          >
                            追加
                          </button>
                        ) : (
                          <button 
                            className="quiz-library__button quiz-library__button--small quiz-library__button--primary"
                            onClick={() => handleStartQuiz(quiz)}
                          >
                            開始
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
        tab={tab}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal {...confirmationProps} />
    </div>
  );
};

export default QuizLibrary;
