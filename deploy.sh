#!/bin/bash

# Cloudflare DDNS Worker Deployment Script

set -e

echo "🚀 Cloudflare DDNS Worker Deployment"
echo "===================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if user is logged in to Wrangler
echo "🔑 Checking Wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Wrangler"
    echo "Run: wrangler login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Ask user if they've set secrets
echo "⚠️  Have you set the required secrets?"
echo "   - CLOUDFLARE_API_TOKEN"
echo "   - CLOUDFLARE_ZONE_ID"
echo "   - DDNS_USERNAME"
echo "   - DDNS_PASSWORD"
echo ""
echo "If not, run:"
echo "  wrangler secret put CLOUDFLARE_API_TOKEN"
echo "  wrangler secret put CLOUDFLARE_ZONE_ID"
echo "  wrangler secret put DDNS_USERNAME"
echo "  wrangler secret put DDNS_PASSWORD"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Deploy
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Note your worker URL from the output above"
echo "   2. Configure your router with:"
echo "      - Server: <your-worker-url>"
echo "      - Hostname: <your-hostname>"
echo "      - Username: <your-ddns-username>"
echo "      - Password: <your-ddns-password>"
echo "   3. Test with: curl https://<your-worker-url>/health"
echo ""
