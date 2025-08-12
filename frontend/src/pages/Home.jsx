import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();

  const handleHostLogin = () => {
    if (user) {
      // If user is already authenticated, go directly to dashboard
      navigate('/dashboard');
    } else {
      // If not authenticated, go to login
      navigate('/login');
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  return (
    <div className="home">
      <div className="home__container">
        {/* Header Section */}
        <header className="home__header">
          <div className="home__logo">
            <img src="/logo.png" alt="TUIZ Logo" className="home__logo-image" />
          </div>
          <h1 className="home__title">TUIZ情報王</h1>
        </header>

        {/* Main Action Section */}
        <section className="home__actions">
          <div className="home__cards">
            <div className="home__card home__card--host" onClick={handleHostLogin}>
              <div className="home__card-icon home__card-icon--host">
                <FaBullseye size={60} />
              </div>
              <h3 className="home__card-title">ホストとしてログイン</h3>
              <p className="home__card-description">クイズを作成・管理し、クイズを開始、ホスト</p>
              <button className="home__button home__button--host">
                ログイン
              </button>
            </div>

            <div className="home__card home__card--player" onClick={handleJoinGame}>
              <div className="home__card-icon home__card-icon--player">
                <MdGames size={60} />
              </div>
              <h3 className="home__card-title">ゲームに参加</h3>
              <p className="home__card-description">ルームコードを入力してクイズゲームに参加</p>
              <button className="home__button home__button--player">
                ゲーム参加
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="home__features">
          <div className="home__features-grid">
            <div className="home__feature">
              <div className="home__feature-icon home__feature-icon--lightning">
                <FaBolt size={40} />
              </div>
              <h4 className="home__feature-title">リアルタイム</h4>
              <p className="home__feature-description">瞬時に同期</p>
            </div>
            <div className="home__feature">
              <div className="home__feature-icon home__feature-icon--education">
                <MdSchool size={40} />
              </div>
              <h4 className="home__feature-title">教育的</h4>
              <p className="home__feature-description">学習に最適</p>
            </div>
            <div className="home__feature">
              <div className="home__feature-icon home__feature-icon--interactive">
                <MdColorLens size={40} />
              </div>
              <h4 className="home__feature-title">インタラクティブ</h4>
              <p className="home__feature-description">魅力的な体験</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home__footer">
          <div className="home__footer-content">
            <div className="home__footer-main">
              <p className="home__footer-copyright">&copy; 2025 TUIZ情報王. All rights reserved.</p>
              <p className="home__footer-tagline">
                Developed with <FaHeart className="home__footer-heart" /> for educational and entertainment purposes
              </p>
            </div>
            <div className="home__footer-tech">
              <span>v1.0.0</span> • 
              <span>React + Socket.IO</span> • 
              <span>Real-time Quiz Platform</span>
            </div>
            <div className="home__footer-license">
              <span><FaFileAlt className="home__footer-icon" /> Apache License 2.0</span> • 
              <span><FaRocket className="home__footer-icon home__footer-icon--rocket" /> Open Source</span> • 
              <span><FaStar className="home__footer-icon home__footer-icon--star" /> Built by PandaDev0069</span>
            </div>
            <div className="home__footer-links">
              <a href="https://github.com/PandaDev0069/TUIZ" target="_blank" rel="noopener noreferrer" className="home__footer-link">
                GitHub
              </a>
              <span>•</span>
              <a href="/license" className="home__footer-link">
                License
              </a>
              <span>•</span>
              <a href="/privacy" className="home__footer-link">Privacy</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;
