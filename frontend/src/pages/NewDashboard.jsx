import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import './NewDashboard.css';

// Lucide Icons
import { CircleUserRound, LogOut, LayoutDashboard, SquarePen, Gamepad2, BarChart3, FolderOpen } from 'lucide-react';

const NewDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [profileImageError, setProfileImageError] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getGreeting = () => {
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

  const refreshUserData = async () => {
    try {
      await refreshUser();
      setProfileImageError(false);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <div className="dashboard">
        {/* Header */}
        <header className="dashboard__header">
          <div className="dashboard__header-left">
            <div className="dashboard__logo-section">
              <img src="/logo.png" alt="TUIZ Logo" className="dashboard__logo" />
              <div className="dashboard__title-group">
                <h1 className="dashboard__title">TUIZ情報王</h1>
                <p className="dashboard__welcome-message">{getGreeting()}</p>
              </div>
            </div>
          </div>
          <div className="dashboard__header-right">
            <button 
              className="dashboard__profile-button"
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
                  <CircleUserRound size={24} color="#fff" />
                </span>
              )}
              {user?.name}
            </button>
            <button 
              className="new-dashboard-button" 
              onClick={() => navigate('/dashboard')}
              title="Go to Original Dashboard"
            >
              <LayoutDashboard /> Old Dashboard
            </button>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={22} className="logout-icon" />
              ログアウト
            </button>
          </div>
        </header>

      {/* Main Content */}
      <div className="dashboard__content">
        <main className="dashboard__main">
          {/* Quick Actions */}
          <section className="dashboard__quick-actions">
            <div className="dashboard__action-grid">
              <div className="dashboard__action-card" onClick={() => navigate('/create-quiz')}>
                <div className="dashboard__action-icon">
                  <SquarePen size={32} color="#fff" />
                </div>
                <h3 className="dashboard__action-title">新しいクイズを作成</h3>
              </div>

              <div className="dashboard__action-card" onClick={() => navigate('/join')}>
                <div className="dashboard__action-icon">
                  <Gamepad2 size={32} color="#fff" />
                </div>
                <h3 className="dashboard__action-title">ゲームに参加</h3>
              </div>

              <div className="dashboard__action-card dashboard__action-card--disabled">
                <div className="dashboard__action-icon">
                  <BarChart3 size={32} color="#fff" />
                </div>
                <h3 className="dashboard__action-title">分析・統計</h3>
                <div className="dashboard__action-badge dashboard__action-badge--coming-soon">準備中</div>
              </div>

              <div className="dashboard__action-card dashboard__action-card--disabled">
                <div className="dashboard__action-icon">
                  <FolderOpen size={32} color="#fff" />
                </div>
                <h3 className="dashboard__action-title">クイズライブラリ</h3>
                <div className="dashboard__action-badge dashboard__action-badge--coming-soon">準備中</div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={refreshUserData}
      />
    </div>
  );
};

export default NewDashboard;
