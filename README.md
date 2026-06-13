# Cloudflare DDNS Worker

Production-ready Dynamic DNS service running on Cloudflare Workers. Allows your travel router (or any device) to automatically update DNS records with your current public IP address.

## Features

- 🔄 HTTP endpoint for DDNS updates (compatible with standard DDNS protocols)
- ⏰ Cron-triggered backup updates every 5 minutes
- 🔐 Username/password authentication
- 🚀 Serverless - runs on Cloudflare's edge network
- 📊 Health check endpoint
- 🎯 Low TTL (120s) for fast DNS propagation

## Prerequisites

- Cloudflare account with a domain
- Node.js and npm installed
- Wrangler CLI (`npm install -g wrangler`)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cloudflare-ddns-worker
npm install
```

### 2. Get Your Cloudflare Credentials

#### Zone ID
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Scroll down on the Overview page - your Zone ID is on the right sidebar

#### API Token
1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit zone DNS" template
4. Configure:
   - **Permissions**: Zone > DNS > Edit
   - **Zone Resources**: Include > Specific zone > [Your Domain]
5. Create and copy the token

### 3. Configure Environment Variables

Set your secrets using Wrangler:

```bash
# Set your Cloudflare API token
wrangler secret put CLOUDFLARE_API_TOKEN

# Set your Cloudflare Zone ID
wrangler secret put CLOUDFLARE_ZONE_ID

# Set your DDNS username (can be anything you choose)
wrangler secret put DDNS_USERNAME

# Set your DDNS password (choose a strong password)
wrangler secret put DDNS_PASSWORD
```

Edit `wrangler.toml` and set your hostname:

```toml
[vars]
DDNS_HOSTNAME = "router.yourdomain.com"
```

### 4. Deploy to Cloudflare

```bash
npm run deploy
```

After deployment, you'll get a URL like: `https://cloudflare-ddns-worker.your-subdomain.workers.dev`

## Router Configuration

### For Your TripMate Nano Router

Configure the DDNS settings on your router:

- **Server Name/URL**: `cloudflare-ddns-worker.your-subdomain.workers.dev`
- **Hostname**: `router.yourdomain.com` (the subdomain you want to use)
- **Username**: The username you set with `wrangler secret put DDNS_USERNAME`
- **Password**: The password you set with `wrangler secret put DDNS_PASSWORD`

The router should make requests to:
```
https://cloudflare-ddns-worker.your-subdomain.workers.dev/update?hostname=router.yourdomain.com&username=YOUR_USERNAME&password=YOUR_PASSWORD
```

## API Endpoints

### DDNS Update Endpoint

**Endpoint**: `POST/GET /update`

**Parameters**:
- `hostname` (required) - The fully qualified domain name to update
- `username` (required) - Authentication username
- `password` (required) - Authentication password
- `myip` (optional) - IP address to set. If not provided, uses the client's IP

**Example**:
```bash
curl "https://your-worker.workers.dev/update?hostname=router.yourdomain.com&username=myuser&password=mypass"
```

**Response Codes**:
- `good [IP]` - Update successful
- `badauth` - Invalid credentials
- `notfqdn` - Hostname not provided
- `nohost` - Could not determine IP address
- `911` - Server error

### Health Check

**Endpoint**: `GET /health`

Returns service status:
```json
{
  "status": "ok",
  "service": "cloudflare-ddns"
}
```

## How It Works

### HTTP Updates (Primary Method)
1. Your router sends an HTTP request to the `/update` endpoint
2. Worker authenticates the request
3. Worker updates the DNS A record in Cloudflare
4. Router receives confirmation

### Cron Backup (Secondary Method)
1. Every 5 minutes, the cron trigger fires
2. Worker fetches the current public IP from ipify.org
3. Compares with current DNS record
4. Updates only if changed

## Local Development

Run locally with Wrangler:

```bash
npm run dev
```

Test the cron trigger:

```bash
npm run test
```

View live logs:

```bash
npm run tail
```

## Configuration Options

### Proxy Status

By default, DNS records are **not proxied** through Cloudflare (direct to your IP). To enable Cloudflare proxy:

Edit `src/index.js` and change:
```javascript
proxied: false,  // Change to true
```

**Note**: If proxied, Cloudflare will hide your IP but you may need additional configuration for services.

### TTL (Time To Live)

Default TTL is 120 seconds (2 minutes) for fast updates. To change:

```javascript
ttl: 120,  // Change to your preferred value (in seconds)
```

### Cron Frequency

Default is every 5 minutes. Edit `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]  # Standard cron syntax
```

Examples:
- Every minute: `"* * * * *"`
- Every 15 minutes: `"*/15 * * * *"`
- Every hour: `"0 * * * *"`

## Security Considerations

1. **Use Strong Passwords**: Choose a strong, unique password for DDNS authentication
2. **HTTPS Only**: All communications are over HTTPS
3. **API Token Permissions**: Use a token with only DNS edit permissions for your specific zone
4. **Secrets Management**: Never commit secrets to git - always use `wrangler secret put`

## Troubleshooting

### DNS not updating

1. Check your router is making requests: `npm run tail` and watch for incoming requests
2. Verify your Cloudflare API token has DNS edit permissions
3. Confirm your Zone ID is correct
4. Check the hostname matches exactly (including any subdomains)

### Authentication failures

- Verify username and password match what you set with `wrangler secret put`
- Check your router is sending credentials correctly

### Cron not running

- Verify the cron trigger is configured in `wrangler.toml`
- Check logs: `wrangler tail` to see cron executions
- Cron triggers may take a few minutes after deployment to activate

## Network Details

Your router's internal network:
- Device IP: `10.31.20.21`
- Netmask: `255.255.255.0`
- DHCP Range: `10.31.20.22` - `10.31.20.71`

**Important**: This worker updates your **public IP** address, not the internal `10.31.20.21` address. When you access `router.yourdomain.com` from outside your network, it will resolve to your public IP, and then you'll need port forwarding on your router to access the device at `10.31.20.21`.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
