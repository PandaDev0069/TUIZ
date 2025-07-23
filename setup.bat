@echo off
setlocal enabledelayedexpansion

REM TUIZ Setup Script for Windows
REM This script helps set up the development environment for all sub-repositories

echo 🎯 TUIZ Project Setup
echo ====================

REM Function to check if command exists
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
echo ✅ npm is installed

REM Setup backend
echo.
echo ⚡ Setting up backend...
cd backend

if not exist ".env" (
    echo 📝 Creating backend .env file...
    copy .env.example .env
    echo ⚠️  Please edit backend\.env with your configuration
) else (
    echo ✅ Backend .env file already exists
)

echo 📦 Installing backend dependencies...
call npm install

cd ..

REM Setup frontend
echo.
echo 🎨 Setting up frontend...
cd frontend

if not exist ".env.local" (
    echo 📝 Creating frontend .env.local file...
    copy .env.example .env.local
    echo ⚠️  Please edit frontend\.env.local with your configuration
) else (
    echo ✅ Frontend .env.local file already exists
)

echo 📦 Installing frontend dependencies...
call npm install

cd ..

REM Database setup instructions
echo.
echo 🗄️  Database Setup Instructions
echo ================================
echo 1. Create a Supabase account at https://supabase.com
echo 2. Create a new project
echo 3. Go to SQL Editor in your Supabase dashboard
echo 4. Run the migration files in order from database\migrations\
echo 5. Optionally load sample data from database\sample-data\
echo 6. Update your .env files with Supabase credentials
echo.

REM Final instructions
echo 🚀 Setup Complete!
echo ==================
echo.
echo Next steps:
echo 1. Configure your environment variables:
echo    - Edit backend\.env
echo    - Edit frontend\.env.local
echo.
echo 2. Set up your Supabase database:
echo    - Follow the instructions in database\README.md
echo.
echo 3. Start the development servers:
echo    - Backend: cd backend ^&^& npm run dev
echo    - Frontend: cd frontend ^&^& npm run dev
echo.
echo 4. Access your app:
echo    - Frontend: http://localhost:5173
echo    - Backend: http://localhost:3001
echo.
echo 📚 For more information, check the README files in each sub-repository.

pause
