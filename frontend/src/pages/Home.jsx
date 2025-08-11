import { useNavigate } from 'react-router-dom';
import { 
  FaBullseye, 
  FaGamepad, 
  FaBolt, 
  FaGraduationCap, 
  FaPalette, 
  FaHeart, 
  FaFileAlt, 
  FaRocket, 
  FaStar 
} from 'react-icons/fa';
import { 
  MdGames, 
  MdSchool, 
  MdColorLens 
} from 'react-icons/md';
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
        </header>

        {/* Main Action Section */}
        <section className="main-actions">
          <div className="action-cards">
            <div className="action-card host-card" onClick={handleHostLogin}>
              <div className="card-icon host-icon">
                <FaBullseye size={60} />
              </div>
              <h3>ホストとしてログイン</h3>
              <p>クイズを作成・管理し、クイズを開始、ホスト</p>
              <button className="action-button host-button">
                ログイン
              </button>
            </div>

            <div className="action-card player-card" onClick={handleJoinGame}>
              <div className="card-icon player-icon">
                <MdGames size={60} />
              </div>
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
              <div className="feature-icon lightning-icon">
                <FaBolt size={40} />
              </div>
              <h4>リアルタイム</h4>
              <p>瞬時に同期</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon education-icon">
                <MdSchool size={40} />
              </div>
              <h4>教育的</h4>
              <p>学習に最適</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon interactive-icon">
                <MdColorLens size={40} />
              </div>
              <h4>インタラクティブ</h4>
              <p>魅力的な体験</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-content">
            <div className="footer-main">
              <p>&copy; 2025 TUIZ情報王. All rights reserved.</p>
              <p>Developed with <FaHeart className="inline-heart-icon" /> for educational and entertainment purposes</p>
            </div>
            <div className="footer-tech">
              <span>v1.0.0</span> • 
              <span>React + Socket.IO</span> • 
              <span>Real-time Quiz Platform</span>
            </div>
            <div className="footer-license">
              <span><FaFileAlt className="inline-footer-icon" /> Apache License 2.0</span> • 
              <span><FaRocket className="inline-footer-icon rocket-icon" /> Open Source</span> • 
              <span><FaStar className="inline-footer-icon star-icon" /> Built by PandaDev0069</span>
            </div>
            <div className="footer-links">
              <a href="https://github.com/PandaDev0069/TUIZ" target="_blank" rel="noopener noreferrer" className="footer-link">
                GitHub
              </a>
              <span>•</span>
              <a href="/license" className="footer-link">
                License
              </a>
              <span>•</span>
              <a href="/privacy" className="footer-link">Privacy</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;
