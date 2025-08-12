import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { showError, showSuccess } from '../utils/toast';
import LoadingSkeleton from '../components/LoadingSkeleton';
import socket from '../socket';
import { apiConfig } from '../utils/apiConfig';
import { 
  FaGamepad, 
  FaRocket, 
  FaPencilAlt, 
  FaBook, 
  FaClipboardList, 
  FaCheckCircle, 
  FaBullseye, 
  FaLightbulb,
} from 'react-icons/fa';
import './host.css';

function Host() {
  const { user } = useAuth();
  const [title, setTitle] = useState('')
  const [questionSets, setQuestionSets] = useState([])
  const [selectedQuestionSet, setSelectedQuestionSet] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch available question sets when component mounts
    fetchQuestionSets()
  }, [])

  const fetchQuestionSets = async () => {
    try {
      const response = await fetch(apiConfig.getUrl('questionSetsPublic'));
      const data = await response.json();
      setQuestionSets(data.questionSets || [])
      if (data.questionSets && data.questionSets.length > 0) {
        setSelectedQuestionSet(data.questionSets[0].id)
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching question sets:', error);
      }
      // Set a default if fetch fails
      setQuestionSets([{
        id: 'default-questions',
        title: 'サンプルクイズ',
        description: '基本的な日本の知識クイズ'
      }])
      setSelectedQuestionSet('default-questions')
    } finally {
      setLoading(false)
    }
  }

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleCreateRoom = () => {
    if (!selectedQuestionSet) {
      showError('問題セットを選択してください。');
      return;
    }
    
    setCreating(true);
    
    socket.emit('createGame', { 
      hostId: `host_${user.id}`, // Use user ID without timestamp
      questionSetId: selectedQuestionSet,
      settings: {
        title: title || null, // Send null if no manual title provided
        fromQuestionSet: true // Flag to indicate we want to use question set settings
      }
    })
    
    // Listen for game creation success
    socket.once('gameCreated', ({ game, gameCode }) => {
      if (import.meta.env.DEV) {
        console.log('Game created successfully:', game);
      }
      showSuccess(`ゲーム作成完了！ルームコード: ${gameCode}`);
      navigate('/host/lobby', { 
        state: { 
          room: gameCode, 
          title, 
          gameId: game.id,
          questionSetId: selectedQuestionSet 
        } 
      })
    })
    
    // Listen for errors
    socket.once('error', ({ message }) => {
      if (import.meta.env.DEV) {
        console.error('Game creation failed:', message);
      }
      showError('ゲーム作成に失敗しました: ' + message);
      setCreating(false);
    })
  }

  return (
    <div className="host-page">
      <div className="host-container">
        {/* Header Section */}
        <div className="host-header">
          <div className="host-header__brand">
            <h1 className="host-header__title">
              <FaGamepad className="host-header__icon" /> TUIZ情報王
            </h1>
            <p className="host-header__subtitle">新しいクイズゲームを開始しましょう</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="host-content">
          <div className="host-card host-card--primary">
            <div className="host-card__header">
              <h2 className="host-card__title">
                <FaRocket className="host-card__title-icon" /> クイズゲーム作成
              </h2>
              <p className="host-card__subtitle">設定を選択してプレイヤーを招待しよう</p>
            </div>

            <div className="host-card__content">
              <div className="host-form">
                {/* Title Input Section */}
                <div className="host-form__group">
                  <label htmlFor="quizTitle" className="host-form__label">
                    <FaPencilAlt className="host-form__label-icon" />
                    クイズタイトル（オプション）
                  </label>
                  <input
                    id="quizTitle"
                    className="host-input host-input--animated"
                    type="text"
                    placeholder="カスタムタイトルを入力（空白の場合は問題セットのタイトルを使用）"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoComplete="off"
                    disabled={creating}
                  />
                  <div className="host-form__hint">
                    <FaLightbulb className="host-form__hint-icon" />
                    空白のままにすると、選択した問題セットのタイトルが使用されます
                  </div>
                </div>

                {/* Question Set Selection */}
                {loading ? (
                  <div className="host-form__group">
                    <label className="host-form__label">
                      <FaBook className="host-form__label-icon" />
                      問題セット選択
                    </label>
                    <LoadingSkeleton type="text" count={3} />
                  </div>
                ) : (
                  <div className="host-form__group">
                    <label htmlFor="questionSet" className="host-form__label">
                      <FaBook className="host-form__label-icon" />
                      問題セットを選択
                    </label>
                    <select
                      id="questionSet"
                      className="host-input host-input--select"
                      value={selectedQuestionSet}
                      onChange={(e) => setSelectedQuestionSet(e.target.value)}
                      disabled={creating}
                    >
                      <option value="">問題セットを選択してください</option>
                      {questionSets.map((qs) => (
                        <option key={qs.id} value={qs.id}>
                          {qs.title} ({qs.total_questions || 'N/A'}問)
                        </option>
                      ))}
                    </select>
                    
                    {/* Question Set Preview */}
                    {selectedQuestionSet && (
                      <div className="host-preview-card">
                        <div className="host-preview-card__header">
                          <h4 className="host-preview-card__title">
                            <FaClipboardList className="host-preview-card__title-icon" />
                            選択された問題セット
                          </h4>
                        </div>
                        <div className="host-preview-card__content">
                          {(() => {
                            const selectedSet = questionSets.find(qs => qs.id === selectedQuestionSet);
                            return selectedSet ? (
                              <>
                                <div className="host-preview__info">
                                  <div className="host-preview__field">
                                    <span className="host-preview__label">タイトル:</span>
                                    <span className="host-preview__value">{selectedSet.title}</span>
                                  </div>
                                  <div className="host-preview__field">
                                    <span className="host-preview__label">問題数:</span>
                                    <span className="host-preview__value host-badge host-badge--primary">
                                      {selectedSet.total_questions || 'N/A'}問
                                    </span>
                                  </div>
                                  {selectedSet.description && (
                                    <div className="host-preview__field">
                                      <span className="host-preview__label">説明:</span>
                                      <span className="host-preview__value">{selectedSet.description}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="host-preview__status">
                                  <span className="host-badge host-badge--success">
                                    <FaCheckCircle className="host-badge__icon" />
                                    準備完了
                                  </span>
                                </div>
                              </>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="host-card__footer">
              <button 
                className={`host-button host-button--large host-button--primary ${creating ? 'host-button--loading' : ''}`}
                onClick={handleCreateRoom} 
                disabled={loading || !selectedQuestionSet || creating}
              >
                {creating ? (
                  <>
                    <div className="host-loading__spinner"></div>
                    <span>ゲーム作成中...</span>
                  </>
                ) : (
                  <>
                    <span><FaGamepad className="host-button__icon" /> ゲームを作成</span>
                  </>
                )}
              </button>
              
              {selectedQuestionSet && !creating && (
                <div className="host-card__footer-hint">
                  <FaBullseye className="host-help__icon" /> プレイヤーがルームコードで参加できるようになります
                </div>
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="host-help-section">
            <div className="host-help-card">
              <h3 className="host-help-card__title"><FaLightbulb className="host-help-card__icon" /> ホストガイド</h3>
              <div className="host-help-card__content">
                <div className="host-help__step">
                  <span className="host-help__number">1</span>
                  <div className="host-help__text">
                    <strong>問題セットを選択</strong>
                    <p>プレイしたい問題セットを選んでください</p>
                  </div>
                </div>
                <div className="host-help__step">
                  <span className="host-help__number">2</span>
                  <div className="host-help__text">
                    <strong>ゲームを作成</strong>
                    <p>ルームコードが生成されます</p>
                  </div>
                </div>
                <div className="host-help__step">
                  <span className="host-help__number">3</span>
                  <div className="host-help__text">
                    <strong>プレイヤーを招待</strong>
                    <p>ルームコードを共有してプレイヤーを招待</p>
                  </div>
                </div>
                <div className="host-help__step">
                  <span className="host-help__number">4</span>
                  <div className="host-help__text">
                    <strong>ゲーム開始</strong>
                    <p>準備ができたらクイズを開始しましょう</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Host