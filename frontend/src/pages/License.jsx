import { useNavigate } from 'react-router-dom';
import './static-pages.css';

function License() {
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
          <h1>Apache License 2.0</h1>
          <p className="last-updated">TUIZ情報王 - Real-time Quiz Platform</p>
        </header>

        <main className="static-page-main">
          <section className="license-section">
            <div className="license-text">
              <h2>Apache License 2.0</h2>
              <p><strong>Copyright 2025 Panta Aashish</strong></p>
              
              <p>
                Licensed under the Apache License, Version 2.0 (the "License");
                you may not use this file except in compliance with the License.
                You may obtain a copy of the License at
              </p>

              <p className="license-url">
                <a href="http://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">
                  http://www.apache.org/licenses/LICENSE-2.0
                </a>
              </p>

              <p>
                Unless required by applicable law or agreed to in writing, software
                distributed under the License is distributed on an "AS IS" BASIS,
                WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                See the License for the specific language governing permissions and
                limitations under the License.
              </p>
            </div>
          </section>

          <section className="license-info">
            <h2>What does this mean?</h2>
            <div className="license-explanation">
              <div className="permission-item">
                <h3>✅ You can:</h3>
                <ul>
                  <li>Use the software for personal and non-commercial purposes</li>
                  <li>Copy and distribute the source code (non-commercially)</li>
                  <li>Modify the source code</li>
                  <li>Create derivative works (non-commercial)</li>
                  <li>Distribute modified versions (non-commercial)</li>
                  <li>Use for educational purposes</li>
                </ul>
              </div>

              <div className="condition-item">
                <h3>📋 You must:</h3>
                <ul>
                  <li>Include the copyright notice</li>
                  <li>Include the Apache License 2.0 text</li>
                  <li>State significant changes made to the code</li>
                  <li>Preserve all copyright, patent, trademark notices</li>
                  <li>Get explicit permission for commercial use</li>
                </ul>
              </div>

              <div className="limitation-item">
                <h3>❌ You cannot:</h3>
                <ul>
                  <li>Use for commercial purposes without written permission</li>
                  <li>Deploy for profit or resale without permission</li>
                  <li>Use quiz content, images, or branding materials</li>
                  <li>Hold authors liable for damages</li>
                  <li>Expect warranty or support</li>
                  <li>Use trademarks without permission</li>
                </ul>
              </div>
            </div>
            
            <div className="custom-restrictions">
              <h3>🚫 TUIZ-Specific Restrictions:</h3>
              <div className="restriction-details">
                <p><strong>Excluded from License:</strong></p>
                <ul>
                  <li>📚 Quiz content (questions, images, audio files)</li>
                  <li>🎨 Branding materials (logos, banners, icons)</li>
                  <li>🎯 UI/UX design assets (non-source code)</li>
                </ul>
                
                <p><strong>Commercial Use:</strong></p>
                <p>Any commercial deployment, resale, or profit-generating use requires explicit written permission from the author.</p>
                
                <p><strong>Contact for Commercial Licensing:</strong><br />
                For licensing inquiries, please contact via GitHub or project repository.</p>
              </div>
            </div>
          </section>

          <section className="open-source-info">
            <h2>Open Source Project</h2>
            <p>
              TUIZ情報王 is proudly open source! We believe in the power of community-driven development 
              and educational transparency. You can find the complete source code, contribute to the project, 
              or report issues on our GitHub repository.
            </p>
            
            <div className="github-info">
              <h3>🚀 Get Involved:</h3>
              <ul>
                <li>⭐ Star the repository if you find it useful</li>
                <li>🐛 Report bugs and suggest improvements</li>
                <li>🔧 Contribute code and features</li>
                <li>📚 Improve documentation</li>
                <li>💡 Share ideas and feedback</li>
              </ul>
            </div>

            <p className="github-link-section">
              <strong>GitHub Repository:</strong><br />
              <a href="https://github.com/PandaDev0069/TUIZ" target="_blank" rel="noopener noreferrer" className="github-link">
                https://github.com/PandaDev0069/TUIZ
              </a>
            </p>
          </section>

          <section className="tech-stack">
            <h2>Built With</h2>
            <div className="tech-list">
              <div className="tech-category">
                <h4>Frontend:</h4>
                <ul>
                  <li>React 18</li>
                  <li>Vite</li>
                  <li>React Router</li>
                  <li>CSS3</li>
                </ul>
              </div>
              <div className="tech-category">
                <h4>Backend:</h4>
                <ul>
                  <li>Node.js</li>
                  <li>Socket.IO</li>
                  <li>Express.js</li>
                  <li>Supabase</li>
                </ul>
              </div>
              <div className="tech-category">
                <h4>Deployment:</h4>
                <ul>
                  <li>Vercel (Frontend)</li>
                  <li>Render (Backend)</li>
                  <li>Supabase (Database)</li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        <footer className="static-page-footer">
          <p>&copy; 2025 TUIZ情報王. All rights reserved. Licensed under Apache License 2.0.</p>
        </footer>
      </div>
    </div>
  );
}

export default License;
