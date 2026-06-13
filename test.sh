#!/bin/bash

# DDNS Test Script
# Tests the DDNS update endpoint

# Configuration
WORKER_URL="${WORKER_URL:-https://your-worker.workers.dev}"
HOSTNAME="${HOSTNAME:-router.example.com}"
USERNAME="${USERNAME:-testuser}"
PASSWORD="${PASSWORD:-testpass}"

echo "🧪 Testing Cloudflare DDNS Worker"
echo "=================================="
echo ""
echo "Worker URL: $WORKER_URL"
echo "Hostname: $HOSTNAME"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
echo "Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

echo ""

# Test 2: DDNS Update without auth
echo "Test 2: DDNS Update (no auth - should fail)"
echo "-------------------------------------------"
NO_AUTH_RESPONSE=$(curl -s "$WORKER_URL/update?hostname=$HOSTNAME")
echo "Response: $NO_AUTH_RESPONSE"

if echo "$NO_AUTH_RESPONSE" | grep -q "badauth"; then
    echo "✅ Auth check working correctly"
else
    echo "❌ Auth check failed"
fi

echo ""

# Test 3: DDNS Update with auth
echo "Test 3: DDNS Update (with auth)"
echo "--------------------------------"
UPDATE_RESPONSE=$(curl -s "$WORKER_URL/update?hostname=$HOSTNAME&username=$USERNAME&password=$PASSWORD")
echo "Response: $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | grep -q "good"; then
    echo "✅ DDNS update successful"
    IP=$(echo "$UPDATE_RESPONSE" | sed 's/good //')
    echo "   Updated IP: $IP"
elif echo "$UPDATE_RESPONSE" | grep -q "badauth"; then
    echo "❌ Authentication failed - check your credentials"
else
    echo "⚠️  Update response: $UPDATE_RESPONSE"
fi

echo ""
echo "=================================="
echo "Testing complete!"
echo ""
echo "To use this script with your actual worker:"
echo "  WORKER_URL=https://your-worker.workers.dev HOSTNAME=your.domain.com USERNAME=your-user PASSWORD=your-pass ./test.sh"
echo ""
