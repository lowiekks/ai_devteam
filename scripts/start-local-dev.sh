#!/bin/bash

# Start Local Development Environment Script
# This script starts Firebase Emulators and Next.js dev server concurrently

set -e

echo "🚀 Starting Local Development Environment..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed"
    echo "📦 Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "dashboard/.env.local" ]; then
    echo "⚠️  dashboard/.env.local not found"
    echo "📝 Creating from example..."
    cp dashboard/.env.local.example dashboard/.env.local
    echo "✅ Created dashboard/.env.local"
    echo "⚡ Please update it with your Firebase credentials"
    echo ""
fi

# Check if NEXT_PUBLIC_USE_FIREBASE_EMULATORS is set to true
if ! grep -q "NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true" dashboard/.env.local; then
    echo "⚠️  Emulators not enabled in .env.local"
    echo "💡 Setting NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true"
    sed -i 's/NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false/NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true/' dashboard/.env.local
    echo ""
fi

echo "🔥 Starting Firebase Emulators..."
echo "   - Auth: http://localhost:9099"
echo "   - Firestore: http://localhost:8080"
echo "   - Functions: http://localhost:5001"
echo "   - Storage: http://localhost:9199"
echo "   - Emulator UI: http://localhost:4000"
echo ""

# Start emulators in background
firebase emulators:start --import=./emulator-data --export-on-exit &
FIREBASE_PID=$!

# Wait for emulators to be ready
echo "⏳ Waiting for emulators to start..."
sleep 5

# Check if emulators are running
if ! curl -s http://localhost:4000 > /dev/null; then
    echo "❌ Failed to start Firebase Emulators"
    kill $FIREBASE_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Firebase Emulators are ready!"
echo ""

# Start Next.js dev server
echo "⚛️  Starting Next.js development server..."
echo "   http://localhost:3000"
echo ""

cd dashboard && npm run dev &
NEXTJS_PID=$!

# Wait for Next.js to be ready
sleep 3

echo ""
echo "✨ Development environment is ready!"
echo ""
echo "📱 Dashboard: http://localhost:3000"
echo "🔥 Emulator UI: http://localhost:4000"
echo ""
echo "🔑 Test Login:"
echo "   Email: test@example.com"
echo "   Password: password123"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap SIGINT and cleanup
trap "echo '\n\n🛑 Stopping services...'; kill $FIREBASE_PID $NEXTJS_PID 2>/dev/null; exit 0" SIGINT

# Keep script running
wait
