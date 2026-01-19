#!/bin/bash

# Setup HTTPS for local mobile testing
# Creates self-signed certificate for development

echo "🔐 Setting up HTTPS for local development..."
echo ""

# Get local IP address (Mac/Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "192.168.1.37")
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
else
    # Default
    IP="192.168.1.37"
fi

echo "📱 Detected IP address: $IP"
echo ""

# Create certs directory
mkdir -p certs

# Create OpenSSL config file with SAN (Subject Alternative Name) - required for Android
cat > certs/openssl.cnf <<EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = SI
ST = Slovenia
L = Ljubljana
O = Smilelab Development
OU = Mobile Testing
CN = $IP

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = $IP
DNS.1 = localhost
EOF

# Generate self-signed certificate with SAN
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
  -config certs/openssl.cnf -extensions v3_req

if [ $? -eq 0 ]; then
    echo "✅ Certificate created successfully!"
    echo ""
    echo "📋 Next steps:"
    echo ""
    echo "1. Trust the certificate on your phone:"
    echo "   - iOS: AirDrop cert.pem to phone, install it, then:"
    echo "     Settings → General → About → Certificate Trust Settings"
    echo "   - Android: Settings → Security → Install certificate"
    echo ""
    echo "2. Update package.json script:"
    echo '   "dev": "next dev -p 3210 --experimental-https --experimental-https-key ./certs/key.pem --experimental-https-cert ./certs/cert.pem"'
    echo ""
    echo "3. Access via: https://192.168.1.37:3210"
else
    echo "❌ Failed to create certificate"
    exit 1
fi
