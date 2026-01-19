#!/bin/bash

# Start Next.js dev server with HTTPS for mobile testing
# Camera requires HTTPS on most browsers

echo "🚀 Starting HTTPS mobile-friendly dev server..."
echo ""

# Check if certificates exist
if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    echo "❌ SSL certificates not found!"
    echo ""
    echo "Run ./setup-https.sh first to create certificates"
    exit 1
fi

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

# Update NEXTAUTH_URL with HTTPS and network IP
if [ -f .env.local ]; then
    sed -i.tmp "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://$IP:3210\"|g" .env.local
    rm .env.local.tmp 2>/dev/null
    echo "✏️  Updated NEXTAUTH_URL to https://$IP:3210"
else
    echo "⚠️  Warning: .env.local not found"
fi

echo ""
echo "✅ Open this URL on your phone:"
echo ""
echo "   https://$IP:3210"
echo ""
echo "⚠️  IMPORTANT: You need to trust the certificate first!"
echo ""
echo "📋 iOS: AirDrop cert.pem to phone → Install → Settings → General → About → Certificate Trust Settings"
echo "📋 Android: Transfer cert.pem → Settings → Security → Install certificate"
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

# Start Next.js dev server with HTTPS on all interfaces (port 3210)
npm run dev -- --hostname 0.0.0.0 --experimental-https --experimental-https-key ./certs/key.pem --experimental-https-cert ./certs/cert.pem

# Restore on normal exit
cleanup
