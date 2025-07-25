import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showError } from '../utils/toast';
import socket from '../socket';
import './host.css';

function Host() {
  const [title, setTitle] = useState('')
  const [questionSets, setQuestionSets] = useState([])
  const [selectedQuestionSet, setSelectedQuestionSet] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch available question sets when component mounts
    fetchQuestionSets()
  }, [])

  const fetchQuestionSets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/question-sets/public')
      const data = await response.json()
      setQuestionSets(data.questionSets || [])
      if (data.questionSets && data.questionSets.length > 0) {
        setSelectedQuestionSet(data.questionSets[0].id)
      }
    } catch (error) {
      console.error('Error fetching question sets:', error)
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
    if (!title || !selectedQuestionSet) {
      showError('クイズタイトルと問題セットを選択してください。');
      return;
    }
    
    socket.emit('createGame', { 
      hostId: 'host_' + Date.now(), // Generate a temporary host ID
      questionSetId: selectedQuestionSet,
      settings: {
        title: title,
        maxPlayers: 50,
        questionTime: 30
      }
    })
    
    // Listen for game creation success
    socket.once('gameCreated', ({ game, gameCode }) => {
      console.log('Game created successfully:', game);
      navigate('/host/lobby', { state: { room: gameCode, title, gameId: game.id } })
    })
    
    // Listen for errors
    socket.once('error', ({ message }) => {
      console.error('Game creation failed:', message);
      showError('ゲーム作成に失敗しました: ' + message);
    })
  }

  return (
    <div className="page-container">
      <h1>TUIZ情報王</h1>
      <h2>ホスト画面</h2>
      <div className="host-card">
        <p>クイズのタイトルを入力してください。</p>

        <input
          className="input"
          type="text"
          placeholder="クイズのタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {loading ? (
          <p>問題セットを読み込み中...</p>
        ) : (
          <div className="question-set-selector">
            <label htmlFor="questionSet">問題セットを選択:</label>
            <select
              id="questionSet"
              className="input"
              value={selectedQuestionSet}
              onChange={(e) => setSelectedQuestionSet(e.target.value)}
            >
              <option value="">問題セットを選択してください</option>
              {questionSets.map((qs) => (
                <option key={qs.id} value={qs.id}>
                  {qs.title} ({qs.total_questions || 'N/A'}問)
                </option>
              ))}
            </select>
            {selectedQuestionSet && (
              <div className="question-set-info">
                {questionSets.find(qs => qs.id === selectedQuestionSet)?.description}
              </div>
            )}
          </div>
        )}
        
        <button className="button" onClick={handleCreateRoom} disabled={loading || !selectedQuestionSet}>
          作成
        </button>
      </div>
    </div>
  )
}

export default Host