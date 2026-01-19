#!/bin/bash

# Start Next.js dev server for mobile testing
# This script finds your IP, updates NEXTAUTH_URL, and starts the server on all interfaces

echo "🚀 Starting mobile-friendly dev server..."
echo ""

# Get local IP address (Mac/Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "IP not found")
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
else
    # Windows (using WSL or Git Bash)
    IP=$(ipconfig | grep -i "IPv4" | head -1 | awk '{print $NF}')
fi

if [ "$IP" == "IP not found" ]; then
    echo "❌ Could not detect IP address. Make sure you're connected to WiFi."
    exit 1
fi

echo "📱 Your computer's IP address: $IP"
echo ""

# Backup original .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup
    echo "💾 Backed up .env.local to .env.local.backup"
fi

# Update NEXTAUTH_URL with network IP
if [ -f .env.local ]; then
    sed -i.tmp "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://$IP:3210\"|g" .env.local
    rm .env.local.tmp 2>/dev/null
    echo "✏️  Updated NEXTAUTH_URL to http://$IP:3210"
else
    echo "⚠️  Warning: .env.local not found"
fi

echo ""
echo "✅ Open this URL on your phone:"
echo ""
echo "   http://$IP:3210"
echo ""
echo "   Or for materials page:"
echo "   http://$IP:3210/materials"
echo ""
echo "📌 Make sure your phone is on the same WiFi network!"
echo ""
echo "Press Ctrl+C to stop the server and restore settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup function to restore original .env.local
cleanup() {
    echo ""
    echo "🛑 Stopping server..."
    if [ -f .env.local.backup ]; then
        mv .env.local.backup .env.local
        echo "✅ Restored original .env.local"
    fi
    exit 0
}

# Set trap to restore settings on exit
trap cleanup INT TERM

# Start Next.js dev server on all interfaces (port 3210)
npm run dev -- --hostname 0.0.0.0

# Restore on normal exit
cleanup
