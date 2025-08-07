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
          <div className="logo-container">
            <img src="/logo.png" alt="TUIZ Logo" className="app-logo" />
          </div>
          <h1 className="app-title">TUIZ情報王</h1>
          <p className="app-subtitle">Real-time Interactive Quiz Platform</p>
        </header>

        {/* Main Action Section */}
        <section className="main-actions">
          <div className="action-cards">
            <div className="action-card host-card" onClick={handleHostLogin}>
              <div className="card-icon">🎯</div>
              <h3>ホストとしてログイン</h3>
              <p>クイズを作成・管理し、クイズを開始、ホスト</p>
              <button className="action-button host-button">
                ログイン
              </button>
            </div>

            <div className="action-card player-card" onClick={handleJoinGame}>
              <div className="card-icon">🎮</div>
              <h3>ゲームに参加</h3>
              <p>ルームコードを入力してクイズゲームに参加</p>
              <button className="action-button player-button">
                ゲーム参加
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <h4>Real-time</h4>
              <p>Instant synchronization</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📚</div>
              <h4>Educational</h4>
              <p>Perfect for learning</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎨</div>
              <h4>Interactive</h4>
              <p>Engaging experience</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-content">
            <div className="footer-main">
              <p>&copy; 2025 TUIZ情報王. All rights reserved.</p>
              <p>Developed with ❤️ for educational and entertainment purposes</p>
            </div>
            <div className="footer-tech">
              <span>v1.0.0</span> • 
              <span>React + Socket.IO</span> • 
              <span>Real-time Quiz Platform</span>
            </div>
            <div className="footer-license">
              <span>📄 MIT License</span> • 
              <span>🚀 Open Source</span> • 
              <span>🌟 Built by PandaDev0069</span>
            </div>
            <div className="footer-links">
              <a href="https://github.com/PandaDev0069/TUIZ" target="_blank" rel="noopener noreferrer" className="footer-link">
                GitHub
              </a>
              <span>•</span>
              <a href="/LICENSE" className="footer-link">
                License
              </a>
              <span>•</span>
              <span className="footer-link">Privacy</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;
