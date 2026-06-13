# Quick Start Guide

Get your DDNS service running in under 5 minutes!

## Prerequisites

- Node.js installed
- Cloudflare account with a domain
- 5 minutes ⏱️

## Step-by-Step Deployment

### 1️⃣ Install Dependencies

```bash
npm install
npm install -g wrangler  # If not already installed
```

### 2️⃣ Login to Cloudflare

```bash
wrangler login
```

This opens your browser for authentication.

### 3️⃣ Get Your Zone ID

1. Go to https://dash.cloudflare.com
2. Select your domain
3. Scroll down - Zone ID is on the right sidebar
4. Copy it!

### 4️⃣ Create API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use **Edit zone DNS** template
4. Set permissions: **Zone > DNS > Edit**
5. Set zone: **Include > Specific zone > [Your Domain]**
6. Create and copy the token

### 5️⃣ Set Your Hostname

Edit `wrangler.toml`:

```toml
[vars]
DDNS_HOSTNAME = "router.yourdomain.com"  # Change this!
```

### 6️⃣ Configure Secrets

Run these commands and paste your values when prompted:

```bash
wrangler secret put CLOUDFLARE_API_TOKEN
# Paste the API token you created

wrangler secret put CLOUDFLARE_ZONE_ID
# Paste your Zone ID

wrangler secret put DDNS_USERNAME
# Enter a username (e.g., "admin")

wrangler secret put DDNS_PASSWORD
# Enter a strong password
```

### 7️⃣ Deploy! 🚀

```bash
npm run deploy
```

You'll see output like:
```
Published cloudflare-ddns-worker
  https://cloudflare-ddns-worker.your-subdomain.workers.dev
```

**Save this URL!** You need it for your router.

### 8️⃣ Test It

```bash
curl https://your-worker-url.workers.dev/health
```

Should return:
```json
{"status":"ok","service":"cloudflare-ddns"}
```

## Router Configuration

### Your Values:

- **Server URL**: `your-worker-url.workers.dev`
- **Hostname**: `router.yourdomain.com` (what you set in step 5)
- **Username**: What you entered in step 6
- **Password**: What you entered in step 6

### Configure Your Router:

1. Access router admin: `http://10.31.20.21`
2. Find DDNS settings
3. Enter the values above
4. Save and click "Register" or "Update Now"

**Full URL for router:**
```
https://your-worker-url.workers.dev/update?hostname=router.yourdomain.com&username=YOUR_USERNAME&password=YOUR_PASSWORD
```

## Verify It's Working

### Check DNS:
```bash
nslookup router.yourdomain.com
```

Should show your current public IP.

### Check your public IP:
```bash
curl https://api.ipify.org
```

These should match!

## What's Happening?

✅ Your router updates Cloudflare DNS every time your IP changes  
✅ Backup cron job checks every 5 minutes  
✅ Low TTL (2 minutes) means fast DNS updates  
✅ Secure authentication protects your DNS  

## Troubleshooting

### "Authentication failed"
- Recheck username/password match what you set
- Try: `wrangler secret put DDNS_PASSWORD` again

### "DNS not updating"
- Check logs: `wrangler tail`
- Verify Zone ID is correct
- Test manually: 
  ```bash
  curl "https://your-worker-url/update?hostname=router.yourdomain.com&username=USER&password=PASS"
  ```

### "Can't access worker URL"
- Wait a minute after deployment
- Check: `wrangler deployments list`

## Next Steps

📖 Read [TRIPMATE_SETUP.md](TRIPMATE_SETUP.md) for detailed router configuration  
🔧 Read [README.md](README.md) for advanced configuration  
📊 Monitor: `wrangler tail` to see live logs  
🔄 Update: `npm run deploy` to deploy changes  

## Need Help?

Common issues and solutions are in the main [README.md](README.md#troubleshooting)

---

**That's it!** Your DDNS service is live! 🎉
