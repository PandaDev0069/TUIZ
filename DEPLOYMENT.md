# 🚀 TUIZ Deployment Guide

Complete guide for deploying TUIZ to production using free services.

## 📋 Deployment Overview

- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Node.js + Socket.IO)
- **Database**: Supabase (PostgreSQL + Auth)

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Select a region close to your users
5. Set a strong database password
6. Wait for project initialization (2-3 minutes)

### 1.2 Set Up Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Run migration files in order from `database/migrations/`:
   ```sql
   -- Copy and paste each file content, run one by one:
   -- 001_create_users_table.sql
   -- 002_create_quizzes_table.sql
   -- 003_create_questions_table.sql
   -- 004_create_game_sessions_table.sql
   -- 005_create_game_participants_table.sql
   -- 006_create_player_answers_table.sql
   -- 007_create_leaderboards_table.sql
   ```

### 1.3 Configure Real-time (Optional)
1. Go to Database → Replication
2. Enable replication for tables:
   - `game_sessions`
   - `game_participants`
   - `player_answers`
   - `leaderboards`

### 1.4 Load Sample Data (Optional)
```sql
-- Copy and paste content from database/sample-data/sample_data.sql
```

### 1.5 Get Database Credentials
1. Go to Settings → API
2. Copy the following:
   - Project URL
   - Project API keys (anon/public and service_role)

## ⚡ Step 2: Backend Deployment (Render)

### 2.1 Prepare Repository
1. Ensure your code is pushed to GitHub
2. Make sure `backend/package.json` has correct start script:
   ```json
   {
     "scripts": {
       "start": "node server.js",
       "dev": "nodemon server.js"
     }
   }
   ```

### 2.2 Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure deployment:
   - **Name**: `tuiz-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2.3 Set Environment Variables
Add these environment variables in Render:

```env
NODE_ENV=production
PORT=10000

# Supabase (from Step 1.5)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# CORS (update after frontend deployment)
FRONTEND_URL_PROD=https://your-frontend-url.vercel.app
SOCKET_CORS_ORIGIN_PROD=https://your-frontend-url.vercel.app

# Game Configuration
MAX_PLAYERS_PER_ROOM=300
ROOM_CODE_LENGTH=6
QUESTION_TIME_LIMIT=30

# Logging
LOG_LEVEL=info
```

### 2.4 Deploy and Test
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Test health endpoint: `https://your-backend-url.onrender.com/health`

## 🎨 Step 3: Frontend Deployment (Vercel)

### 3.1 Prepare Frontend
1. Update `frontend/vite.config.js` for production build:
   ```javascript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     build: {
       outDir: 'dist',
       sourcemap: false,
       minify: 'terser'
     },
     server: {
       port: 5173
     }
   })
   ```

### 3.2 Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3.3 Set Environment Variables
Add these in Vercel project settings:

```env
# Backend URLs (from Step 2.4)
VITE_BACKEND_URL_PROD=https://your-backend-url.onrender.com
VITE_SOCKET_URL_PROD=wss://your-backend-url.onrender.com

# Supabase (if needed for direct access)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Feature flags
VITE_ENABLE_SOUND=true
VITE_ENABLE_ANIMATIONS=true
VITE_DEBUG_MODE=false
```

### 3.4 Deploy and Configure
1. Click "Deploy"
2. Wait for deployment (2-5 minutes)
3. Copy your Vercel app URL

### 3.5 Update Backend CORS
1. Go back to Render dashboard
2. Update backend environment variables:
   ```env
   FRONTEND_URL_PROD=https://your-actual-vercel-url.vercel.app
   SOCKET_CORS_ORIGIN_PROD=https://your-actual-vercel-url.vercel.app
   ```
3. Redeploy backend

## 🔧 Step 4: Configuration & Testing

### 4.1 Test Full Flow
1. Open your Vercel app URL
2. Create a quiz as host
3. Join the quiz from another device/browser
4. Test real-time gameplay

### 4.2 Common Issues & Solutions

#### Frontend can't connect to backend
- Check CORS configuration in backend
- Verify environment variables in both apps
- Ensure WebSocket support is enabled

#### Database connection issues
- Verify Supabase credentials
- Check RLS policies are correctly set
- Ensure migrations ran successfully

#### Socket.IO connection fails
- Render supports WebSockets on free tier
- Check that frontend uses `wss://` for secure connections
- Verify CORS origins match exactly

### 4.3 Performance Optimization

#### Backend (Render)
- Monitor response times in Render dashboard
- Use connection pooling for database
- Implement rate limiting for API endpoints

#### Frontend (Vercel)
- Enable compression in Vercel settings
- Optimize images and assets
- Use service worker for caching

#### Database (Supabase)
- Monitor query performance
- Add indexes for frequently accessed data
- Use real-time subscriptions efficiently

## 📊 Step 5: Monitoring & Maintenance

### 5.1 Set Up Monitoring
- **Render**: Built-in monitoring and logs
- **Vercel**: Analytics and performance insights
- **Supabase**: Database metrics and logs

### 5.2 Backup Strategy
```sql
-- Set up automated backups in Supabase
-- Go to Settings → Database → Backups
-- Configure daily backups
```

### 5.3 Scaling Considerations

#### Free Tier Limits
- **Render**: 750 hours/month, sleeps after 15min inactivity
- **Vercel**: 100GB bandwidth, 6000 build minutes
- **Supabase**: 500MB database, 2GB bandwidth

#### Upgrade Path
- **Render Pro**: $7/month, no sleep, better performance
- **Vercel Pro**: $20/month, more bandwidth and builds
- **Supabase Pro**: $25/month, 8GB database, more bandwidth

## 🚀 Step 6: Going Live

### 6.1 Domain Setup (Optional)
1. **Vercel**: Add custom domain in project settings
2. **Render**: Add custom domain in service settings
3. Update CORS origins when using custom domains

### 6.2 SSL/HTTPS
- Both Vercel and Render provide free SSL certificates
- Ensure all URLs use `https://` and `wss://`

### 6.3 Final Checklist
- [ ] Database schema deployed
- [ ] Backend deployed and health check passes
- [ ] Frontend deployed and loads correctly
- [ ] Real-time features work (Socket.IO)
- [ ] Authentication flow works
- [ ] Quiz creation and gameplay tested
- [ ] Mobile responsiveness verified
- [ ] Performance is acceptable
- [ ] Error monitoring set up

## 📞 Support & Troubleshooting

### Common Commands
```bash
# Check deployment logs
# Render: View in dashboard
# Vercel: Use Vercel CLI - vercel logs

# Test backend health
curl https://your-backend-url.onrender.com/health

# Test database connection
# Use Supabase SQL Editor to run test queries
```

### Resources
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Socket.IO Documentation](https://socket.io/docs/)

### Getting Help
- Check service status pages
- Review deployment logs
- Test locally with production environment variables
- Use browser dev tools for frontend debugging
