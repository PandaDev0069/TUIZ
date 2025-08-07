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
          <h1>MIT License</h1>
          <p className="last-updated">TUIZ情報王 - Real-time Quiz Platform</p>
        </header>

        <main className="static-page-main">
          <section className="license-section">
            <div className="license-text">
              <h2>MIT License</h2>
              <p><strong>Copyright (c) 2025 TUIZ 情報王</strong></p>
              
              <p>
                Permission is hereby granted, free of charge, to any person obtaining a copy
                of this software and associated documentation files (the "Software"), to deal
                in the Software without restriction, including without limitation the rights
                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                copies of the Software, and to permit persons to whom the Software is
                furnished to do so, subject to the following conditions:
              </p>

              <p>
                The above copyright notice and this permission notice shall be included in all
                copies or substantial portions of the Software.
              </p>

              <p>
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                SOFTWARE.
              </p>
            </div>
          </section>

          <section className="license-info">
            <h2>What does this mean?</h2>
            <div className="license-explanation">
              <div className="permission-item">
                <h3>✅ You can:</h3>
                <ul>
                  <li>Use the software for any purpose</li>
                  <li>Copy and distribute the software</li>
                  <li>Modify the software</li>
                  <li>Create derivative works</li>
                  <li>Use it for commercial purposes</li>
                  <li>Distribute modified versions</li>
                </ul>
              </div>

              <div className="condition-item">
                <h3>📋 Conditions:</h3>
                <ul>
                  <li>Include the original copyright notice</li>
                  <li>Include the license text in copies</li>
                  <li>State any significant changes made</li>
                </ul>
              </div>

              <div className="limitation-item">
                <h3>❌ Limitations:</h3>
                <ul>
                  <li>No warranty is provided</li>
                  <li>Authors are not liable for damages</li>
                  <li>No guarantee of support or maintenance</li>
                </ul>
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
          <p>&copy; 2025 TUIZ情報王. All rights reserved. Licensed under MIT License.</p>
        </footer>
      </div>
    </div>
  );
}

export default License;
