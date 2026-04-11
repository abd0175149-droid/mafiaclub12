#!/bin/bash
set -e

echo "🎮 Mafia Club — Deploy Script"
echo "=============================="

# Pull latest from GitHub
echo "📥 Pulling latest code..."
git fetch origin
git reset --hard origin/main

# Build and start
echo "🐳 Building Docker container..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "✅ Deploy complete!"
echo "🌐 App running on http://localhost:3000"
echo "📁 Database: ./data/mafia.db"
echo ""
echo "Default login: admin / admin123"
echo "⚠️  Change the password after first login!"
