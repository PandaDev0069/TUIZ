#!/bin/bash

# TUIZ Setup Script
# This script helps set up the development environment for all sub-repositories

set -e

echo "🎯 TUIZ Project Setup"
echo "===================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) is installed"
echo "✅ npm $(npm --version) is installed"

# Setup backend
echo ""
echo "⚡ Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your configuration"
else
    echo "✅ Backend .env file already exists"
fi

echo "📦 Installing backend dependencies..."
npm install

cd ..

# Setup frontend
echo ""
echo "🎨 Setting up frontend..."
cd frontend

if [ ! -f ".env.local" ]; then
    echo "📝 Creating frontend .env.local file..."
    cp .env.example .env.local
    echo "⚠️  Please edit frontend/.env.local with your configuration"
else
    echo "✅ Frontend .env.local file already exists"
fi

echo "📦 Installing frontend dependencies..."
npm install

cd ..

# Database setup instructions
echo ""
echo "🗄️  Database Setup Instructions"
echo "================================"
echo "1. Create a Supabase account at https://supabase.com"
echo "2. Create a new project"
echo "3. Go to SQL Editor in your Supabase dashboard"
echo "4. Run the migration files in order from database/migrations/"
echo "5. Optionally load sample data from database/sample-data/"
echo "6. Update your .env files with Supabase credentials"
echo ""

# Final instructions
echo "🚀 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Configure your environment variables:"
echo "   - Edit backend/.env"
echo "   - Edit frontend/.env.local"
echo ""
echo "2. Set up your Supabase database:"
echo "   - Follow the instructions in database/README.md"
echo ""
echo "3. Start the development servers:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
echo "4. Access your app:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend: http://localhost:3001"
echo ""
echo "📚 For more information, check the README files in each sub-repository."
