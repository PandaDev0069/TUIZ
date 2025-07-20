import { useNavigate } from 'react-router-dom';
import './home.css';

function Home() {
  const navigate = useNavigate();

  const handleHostLogin = () => {
    navigate('/login');
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  return (
    <div className="home-container">
      <div className="home-content">
        {/* Header Section */}
        <header className="home-header">
          <h1 className="app-title">TUIZ情報王</h1>
        </header>

        {/* Main Action Section */}
        <section className="main-actions">
          <div className="action-cards">
            <div className="action-card host-card" onClick={handleHostLogin}>
              <div className="card-icon">🎯</div>
              <h3>ホストとしてログイン</h3>
              <p>クイズを作成・管理し、プレイヤーをリードしましょう</p>
              <button className="action-button host-button">
                ログイン
              </button>
            </div>

            <div className="action-card player-card" onClick={handleJoinGame}>
              <div className="card-icon">🎮</div>
              <h3>ゲームに参加</h3>
              <p>ルームコードを入力してクイズゲームに参加しましょう</p>
              <button className="action-button player-button">
                ゲーム参加
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-content">
            <p>&copy; 2025 TUIZ情報王. All rights reserved.</p>
            <p>Developed with ❤️ for educational and entertainment purposes</p>
            <div className="footer-links">
              <span>v1.0.0</span> • 
              <span>React + Socket.IO</span> • 
              <span>Real-time Quiz Platform</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;
