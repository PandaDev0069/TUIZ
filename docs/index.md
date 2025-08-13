---
layout: default
title: "TUIZ Documentation Home"
permalink: /
---

# 🎮 TUIZ Documentation

Welcome to the **TUIZ Real-time Quiz Application** documentation portal.

## 🚀 Quick Start

- **New Developer?** Start with [Development Guide](./DEVELOPMENT_GUIDE.md)
- **Found a Bug?** Report it in [Bug Tracker](./BUG_TRACKER.md)
- **Want a Feature?** Add it to [Feature Requests](./FEATURE_REQUESTS.md)
- **Check Progress?** See our [Roadmap](./ROADMAP.md)

## 📁 Documentation Navigation

<div class="doc-grid">
  <div class="doc-card">
    <h3>🐛 <a href="./BUG_TRACKER.html">Bug Tracker</a></h3>
    <p>Active issues, resolved bugs, and tracking system</p>
  </div>
  
  <div class="doc-card">
    <h3>📋 <a href="./TODO.html">TODO List</a></h3>
    <p>Development tasks organized by priority</p>
  </div>
  
  <div class="doc-card">
    <h3>🗺️ <a href="./ROADMAP.html">Roadmap</a></h3>
    <p>Strategic development timeline and milestones</p>
  </div>
  
  <div class="doc-card">
    <h3>🌟 <a href="./FEATURE_REQUESTS.html">Features</a></h3>
    <p>User requests and planned enhancements</p>
  </div>
  
  <div class="doc-card">
    <h3>🛠️ <a href="./DEVELOPMENT_GUIDE.html">Dev Guide</a></h3>
    <p>Setup, workflow, and coding standards</p>
  </div>
  
  <div class="doc-card">
    <h3>🗃️ <a href="./database/">Database</a></h3>
    <p>Schemas, migrations, and deployment guides</p>
  </div>
  
  <div class="doc-card">
    <h3>🎮 <a href="./tuiz-flow-canvas.html">Game Flow Canvas</a></h3>
    <p>Interactive visual guide to game session lifecycles and architecture</p>
  </div>
</div>

## 🎯 Project Status

**Current Version**: 1.0.0-dev  
**Last Updated**: {{ site.time | date: "%B %d, %Y" }}  
**Environment**: Development & Production separated  

### 🚀 Deployment Info
- **Frontend**: [Vercel](https://tuiz-nine.vercel.app)
- **Backend**: [Render](https://tuiz-backend.onrender.com)
- **Database**: Supabase

### 📊 Quick Stats
- **Active Bugs**: 6 (3 High Priority)
- **Features in Development**: 5
- **Documentation Pages**: 6

## 🔗 Important Links

- 🏠 **Production**: [tuiz-nine.vercel.app](https://tuiz-nine.vercel.app)
- 📱 **Frontend Repo**: [GitHub](https://github.com/PandaDev0069/TUIZ)
- 🔧 **Backend API**: [Render](https://tuiz-backend.onrender.com)
- 📊 **Database**: Supabase Dashboard

## 📞 Getting Help

- **Bug Reports**: Add to [Bug Tracker](./BUG_TRACKER.md)
- **Feature Requests**: Submit via [Feature Requests](./FEATURE_REQUESTS.md)
- **Development Questions**: Check [Development Guide](./DEVELOPMENT_GUIDE.md)
- **GitHub Issues**: [Repository Issues](https://github.com/PandaDev0069/TUIZ/issues)

---

<div class="footer-info">
  <p><strong>TUIZ</strong> - Real-time Quiz Application | Built with ❤️ by PandaDev0069</p>
  <p>Documentation powered by GitHub Pages</p>
</div>

<style>
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.doc-card {
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 20px;
  background: #f6f8fa;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.doc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.doc-card h3 {
  margin-top: 0;
  color: #0366d6;
}

.doc-card h3 a {
  text-decoration: none;
  color: inherit;
}

.doc-card h3 a:hover {
  text-decoration: underline;
}

.doc-card p {
  color: #586069;
  margin-bottom: 0;
}

.footer-info {
  text-align: center;
  margin-top: 50px;
  padding: 20px;
  border-top: 1px solid #e1e4e8;
  color: #586069;
}

@media (max-width: 768px) {
  .doc-grid {
    grid-template-columns: 1fr;
  }
}
</style>
