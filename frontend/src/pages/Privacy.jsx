import { useNavigate } from 'react-router-dom';
import './static-pages.css';

function Privacy() {
  const navigate = useNavigate();

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="static-page-container">
      <div className="static-page-content">
        <header className="static-page-header">
          <div className="back-button" onClick={handleBackHome}>
            ← Back to Home
          </div>
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: August 7, 2025</p>
        </header>

        <main className="static-page-main">
          <section className="privacy-section">
            <h2>1. Information We Collect</h2>
            <p>
              TUIZ情報王 is designed with privacy in mind. We collect minimal information necessary to provide our quiz platform services:
            </p>
            <ul>
              <li><strong>Account Information:</strong> When you create an account, we collect your username and email address.</li>
              <li><strong>Quiz Data:</strong> Questions, answers, and quiz results you create or participate in.</li>
              <li><strong>Session Data:</strong> Temporary data during active quiz sessions for real-time functionality.</li>
              <li><strong>Usage Analytics:</strong> Basic analytics to improve our service (via Vercel Analytics).</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information for:</p>
            <ul>
              <li>Providing and maintaining the quiz platform service</li>
              <li>Enabling real-time multiplayer quiz functionality</li>
              <li>Improving user experience and platform performance</li>
              <li>Communicating important service updates</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>3. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Supabase infrastructure with industry-standard encryption. 
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="privacy-section">
            <h2>4. Data Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties. 
              Your quiz data remains private and is only shared with other participants during active quiz sessions as part of the game functionality.
            </p>
          </section>

          <section className="privacy-section">
            <h2>5. Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We also use Vercel Analytics 
              for basic usage statistics, which helps us improve the platform. No personal information is 
              shared with analytics providers.
            </p>
          </section>

          <section className="privacy-section">
            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your quiz data</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>7. Children's Privacy</h2>
            <p>
              TUIZ情報王 is designed for educational use and may be used by minors under supervision. 
              We do not knowingly collect personal information from children under 13 without parental consent.
            </p>
          </section>

          <section className="privacy-section">
            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify users of any significant 
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="privacy-section">
            <h2>9. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our GitHub repository:
            </p>
            <p>
              <a href="https://github.com/PandaDev0069/TUIZ" target="_blank" rel="noopener noreferrer" className="contact-link">
                GitHub: PandaDev0069/TUIZ
              </a>
            </p>
          </section>
        </main>

        <footer className="static-page-footer">
          <p>&copy; 2025 TUIZ情報王. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default Privacy;
