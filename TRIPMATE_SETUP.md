# TripMate Nano Router Setup Guide

This guide provides specific instructions for configuring your TripMate Nano travel router with the Cloudflare DDNS Worker.

## Router Information

- **Device IP**: `10.31.20.21`
- **Netmask**: `255.255.255.0`
- **DHCP Range**: `10.31.20.22` - `10.31.20.71`

## Prerequisites

Before configuring your router, ensure:

1. ✅ Worker is deployed to Cloudflare
2. ✅ You have your worker URL (e.g., `cloudflare-ddns-worker.your-subdomain.workers.dev`)
3. ✅ You've set a hostname in Cloudflare DNS (e.g., `router.yourdomain.com`)
4. ✅ You've configured DDNS username and password

## Configuration Steps

### 1. Access Router Admin Panel

1. Connect to your TripMate Nano's Wi-Fi network
2. Open a web browser and go to: `http://10.31.20.21`
3. Log in with your router credentials

### 2. Navigate to DDNS Settings

Look for DDNS or Dynamic DNS settings in your router's admin panel (typically under Advanced Settings or Network Settings).

### 3. Configure DDNS Parameters

Fill in the following fields:

| Field | Value |
|-------|-------|
| **Service/Provider** | Custom or Generic |
| **Server Name** | `cloudflare-ddns-worker.your-subdomain.workers.dev/update` |
| **Hostname** | `router.yourdomain.com` (your full domain) |
| **Username** | Your DDNS username (set via wrangler secret) |
| **Password** | Your DDNS password (set via wrangler secret) |

### 4. Advanced Settings (if available)

- **Update Interval**: 5-10 minutes (optional, as cron backup handles this)
- **Protocol**: HTTP/HTTPS (use HTTPS if available)
- **Port**: 443 (for HTTPS)

### 5. Save and Test

1. Click **Save** or **Apply**
2. Look for a **Register** or **Update Now** button and click it
3. Check the router's DDNS status - it should show "Connected" or "Success"

## URL Format

Your router needs to make requests to:

```
https://cloudflare-ddns-worker.your-subdomain.workers.dev/update?hostname=router.yourdomain.com&username=YOUR_USERNAME&password=YOUR_PASSWORD
```

**Note**: Some routers automatically construct this URL, while others may require you to specify the full URL.

## Router Compatibility Notes

### If your router supports custom DDNS URLs:

Enter the full URL:
```
https://cloudflare-ddns-worker.your-subdomain.workers.dev/update?hostname=router.yourdomain.com&username=YOUR_USERNAME&password=YOUR_PASSWORD
```

### If your router uses separate fields:

- **Server**: `cloudflare-ddns-worker.your-subdomain.workers.dev`
- **Path**: `/update`
- **Hostname**: `router.yourdomain.com`
- **Username**: Your username
- **Password**: Your password

The router should automatically construct the correct URL with query parameters.

## Verification

### Test from Inside Your Network

1. Open terminal on a device connected to the router
2. Check your current public IP:
   ```bash
   curl https://api.ipify.org
   ```

3. Verify DNS record:
   ```bash
   nslookup router.yourdomain.com
   ```
   
   The IP should match your public IP

### Test from Outside Your Network

1. Use your mobile phone (disconnect from Wi-Fi, use cellular data)
2. Try to access: `http://router.yourdomain.com`
   
**Note**: You'll need to configure port forwarding on your router to actually access the device remotely.

## Port Forwarding Setup

To access your router or devices behind it from the internet:

1. In your router settings, find **Port Forwarding** or **Virtual Server**
2. Add a rule:
   - **External Port**: 8080 (or any port you choose)
   - **Internal IP**: `10.31.20.21` (or the device you want to access)
   - **Internal Port**: 80 (or the device's service port)
   - **Protocol**: TCP

3. Access via: `http://router.yourdomain.com:8080`

## Common DDNS URL Patterns

Different routers may expect different URL patterns. Try these if the standard doesn't work:

### Pattern 1: Standard (most common)
```
https://cloudflare-ddns-worker.your-subdomain.workers.dev/update?hostname=router.yourdomain.com&username=USER&password=PASS
```

### Pattern 2: With myip parameter
```
https://cloudflare-ddns-worker.your-subdomain.workers.dev/update?hostname=router.yourdomain.com&myip=[IP]&username=USER&password=PASS
```

Some routers automatically substitute `[IP]` with the current public IP.

### Pattern 3: DynDNS format
```
https://USER:PASS@cloudflare-ddns-worker.your-subdomain.workers.dev/update?hostname=router.yourdomain.com
```

## Troubleshooting

### Router shows "Authentication Failed"

- Double-check username and password match what you set with `wrangler secret put`
- Ensure no extra spaces in credentials
- Try resetting the password: `wrangler secret put DDNS_PASSWORD`

### Router shows "Update Failed" or "Server Error"

- Verify your worker is deployed: `curl https://your-worker-url/health`
- Check worker logs: `wrangler tail`
- Verify Cloudflare API token has DNS edit permissions
- Check Zone ID is correct

### DNS not updating

1. Check router logs for update attempts
2. Monitor worker logs: `wrangler tail`
3. Manually test: 
   ```bash
   curl "https://your-worker-url/update?hostname=router.yourdomain.com&username=USER&password=PASS"
   ```
4. Verify the hostname exists in Cloudflare DNS (or the worker will create it)

### Can't access from outside network

- Verify DNS is resolving to your current IP: `nslookup router.yourdomain.com`
- Check your ISP doesn't block incoming connections (some do for residential plans)
- Ensure port forwarding is configured correctly
- Some ISPs use CGNAT (Carrier-Grade NAT) which prevents port forwarding - contact your ISP if this is the case

## Alternative: Using Cron Only

If you can't get the router's DDNS client working, you can rely on the cron trigger:

1. Set `DDNS_HOSTNAME` in `wrangler.toml`:
   ```toml
   [vars]
   DDNS_HOSTNAME = "router.yourdomain.com"
   ```

2. The worker will automatically check and update your IP every 5 minutes

This method doesn't require any router configuration but may be slower to detect IP changes.

## Security Recommendations

1. **Use a strong password** for DDNS authentication
2. **Use HTTPS** for the DDNS update URL when possible
3. **Limit port forwarding** to only necessary services
4. **Consider using Cloudflare Access** if you need secure remote access
5. **Don't expose your router's admin panel** directly to the internet

## Need Help?

- Check worker logs: `wrangler tail`
- Test the endpoint: Run `./test.sh` with your credentials
- Review router system logs for DDNS update attempts
