# System Architecture

This document explains how the Cloudflare DDNS Worker system works.

## High-Level Overview

```
┌─────────────────┐
│  Your Network   │
│                 │
│  ┌───────────┐  │         ┌──────────────────┐         ┌────────────────┐
│  │ TripMate  │  │         │  Cloudflare      │         │  Cloudflare    │
│  │   Nano    │──┼────────▶│  DDNS Worker     │────────▶│  DNS Servers   │
│  │  Router   │  │ HTTPS   │  (Edge Network)  │  API    │                │
│  └───────────┘  │         └──────────────────┘         └────────────────┘
│                 │                   │
│  10.31.20.21    │                   │ Cron Every 5min
└─────────────────┘                   │
                                      ▼
        Public IP: X.X.X.X      ┌──────────────┐
                                │ IP Check     │
                                │ Service      │
                                └──────────────┘
```

## Component Breakdown

### 1. TripMate Nano Router
- **Location**: Your network (10.31.20.21)
- **Role**: Detects IP changes and sends updates
- **Method**: HTTP GET/POST to worker endpoint
- **Frequency**: On IP change detection

### 2. Cloudflare DDNS Worker
- **Location**: Cloudflare's global edge network
- **Role**: Receives updates and manages DNS records
- **Endpoints**: 
  - `/update` - DDNS update endpoint
  - `/health` - Health check
- **Triggers**:
  - HTTP requests from router
  - Cron job every 5 minutes

### 3. Cloudflare DNS
- **Location**: Cloudflare's DNS infrastructure
- **Role**: Hosts your DNS records
- **Updated By**: Worker via Cloudflare API
- **TTL**: 120 seconds (2 minutes)

### 4. IP Check Service (ipify.org)
- **Location**: External service
- **Role**: Helps worker determine current public IP
- **Used By**: Cron trigger only

## Data Flow

### Method 1: Router-Initiated Update

```
1. Router Detects IP Change
   │
   ├─ Router sends HTTPS request
   │  GET /update?hostname=router.domain.com&username=USER&password=PASS
   │
   ▼
2. Worker Receives Request
   │
   ├─ Validates authentication
   ├─ Extracts client IP from headers
   ├─ Validates hostname
   │
   ▼
3. Worker Queries Cloudflare DNS
   │
   ├─ GET /zones/{zone_id}/dns_records?name=router.domain.com
   ├─ Retrieves current A record
   │
   ▼
4. Worker Updates DNS Record
   │
   ├─ If record exists: PATCH /dns_records/{record_id}
   ├─ If record doesn't exist: POST /dns_records
   ├─ Sets: type=A, content=NEW_IP, ttl=120
   │
   ▼
5. Worker Responds to Router
   │
   └─ Success: "good X.X.X.X"
   └─ Failure: "911 error_message"
```

### Method 2: Cron-Triggered Update

```
1. Cron Trigger Fires (Every 5 minutes)
   │
   ▼
2. Worker Fetches Current Public IP
   │
   ├─ GET https://api.ipify.org?format=json
   ├─ Returns: {"ip": "X.X.X.X"}
   │
   ▼
3. Worker Queries Current DNS Record
   │
   ├─ GET /zones/{zone_id}/dns_records?name=router.domain.com
   ├─ Retrieves: {content: "Y.Y.Y.Y", ...}
   │
   ▼
4. Worker Compares IPs
   │
   ├─ If X.X.X.X == Y.Y.Y.Y
   │   └─ No change, exit
   │
   ├─ If X.X.X.X != Y.Y.Y.Y
   │   └─ Continue to update
   │
   ▼
5. Worker Updates DNS Record
   │
   ├─ PATCH /dns_records/{record_id}
   ├─ Sets: content=X.X.X.X
   │
   ▼
6. Worker Logs Result
   └─ "DNS updated: router.domain.com -> X.X.X.X"
```

## Authentication Flow

```
Request arrives at /update
│
├─ Extract parameters:
│  - hostname
│  - username  
│  - password
│  - myip (optional)
│
▼
Validate username & password
│
├─ Compare with env.DDNS_USERNAME
├─ Compare with env.DDNS_PASSWORD
│
├─ If invalid ────▶ Return "badauth" (401)
│
▼
Continue processing...
```

## DNS Record Lifecycle

```
Initial State:
No DNS record exists for router.domain.com

       │
       ▼
First Update Received
       │
       ├─ Worker checks: GET /dns_records?name=router.domain.com
       ├─ Result: [] (empty)
       │
       ▼
Worker Creates Record
       │
       ├─ POST /dns_records
       ├─ Body: {
       │    type: "A",
       │    name: "router.domain.com",
       │    content: "203.0.113.1",
       │    ttl: 120,
       │    proxied: false
       │  }
       │
       ▼
Record Now Exists
       │
       ▼
Subsequent Updates
       │
       ├─ Worker checks: GET /dns_records?name=router.domain.com
       ├─ Result: [{id: "abc123", content: "203.0.113.1", ...}]
       │
       ▼
Worker Updates Existing Record
       │
       ├─ PATCH /dns_records/abc123
       ├─ Body: {
       │    content: "203.0.113.2"  # New IP
       │  }
       │
       ▼
Record Updated with New IP
```

## Redundancy & Reliability

### Dual Update Methods

The system uses two independent update mechanisms:

```
                ┌─────────────────────┐
                │   Public IP         │
                │   Changes           │
                └──────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐
    │  Router Update  │      │  Cron Trigger   │
    │  (Immediate)    │      │  (Every 5min)   │
    └────────┬────────┘      └────────┬────────┘
             │                        │
             │                        │
             └────────────┬───────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  DDNS Worker    │
                │  Updates DNS    │
                └─────────────────┘
```

**Why Both?**
- **Router Update**: Immediate response to IP changes
- **Cron Trigger**: Backup in case router fails to update
- **Result**: Maximum reliability

### Error Handling

```
Request Processing
│
├─ Try: Process request
│   │
│   ├─ Parse parameters
│   ├─ Authenticate
│   ├─ Update DNS
│   │
│   └─ Success ────▶ Return "good X.X.X.X"
│
└─ Catch: Error
    │
    ├─ Log error details
    ├─ Return appropriate error code
    │
    └─ Error Codes:
        ├─ badauth (401) - Authentication failed
        ├─ notfqdn (400) - Invalid hostname
        ├─ nohost (400)  - IP not found
        └─ dnserr (500)  - Server error
```

## Security Model

### Authentication Layer

```
┌─────────────────────────────┐
│  Incoming Request           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Check Username/Password    │
│  (Stored as Wrangler        │
│   secrets, not in code)     │
└──────────────┬──────────────┘
               │
      ┌────────┴────────┐
      │                 │
   Valid             Invalid
      │                 │
      ▼                 ▼
┌──────────┐      ┌──────────┐
│ Continue │      │ Reject   │
└──────────┘      │ (401)    │
                  └──────────┘
```

### API Token Permissions

```
Cloudflare API Token
│
├─ Permission: Zone.DNS.Edit
├─ Zone: Specific zone only
├─ Stored: Wrangler secret
└─ Never exposed in code/logs
```

### Data Protection

```
Secrets Storage:
├─ CLOUDFLARE_API_TOKEN ──▶ Wrangler Secret (encrypted)
├─ CLOUDFLARE_ZONE_ID ────▶ Wrangler Secret (encrypted)
├─ DDNS_USERNAME ─────────▶ Wrangler Secret (encrypted)
└─ DDNS_PASSWORD ─────────▶ Wrangler Secret (encrypted)

Public Variables:
└─ DDNS_HOSTNAME ─────────▶ wrangler.toml (not secret)

All Communication:
└─ HTTPS only (TLS encrypted)
```

## Performance Characteristics

### Response Times

```
HTTP Update Request:
├─ Router to Worker: ~50-200ms (depends on location)
├─ Worker processing: ~10-50ms
├─ DNS API update: ~100-500ms
└─ Total: ~160-750ms typical

Cron Trigger:
├─ IP check: ~100-300ms
├─ DNS lookup: ~100-300ms  
├─ DNS update: ~100-500ms
└─ Total: ~300-1100ms typical
```

### DNS Propagation

```
DNS Record Update
│
├─ TTL: 120 seconds
│
└─ Maximum propagation time: ~2-3 minutes
    │
    ├─ Most resolvers: 2 minutes
    └─ All resolvers: 3 minutes maximum
```

### Scalability

```
Cloudflare Workers:
├─ Request limit: 100,000 requests/day (free tier)
├─ CPU time: 10ms per request (well under limit)
├─ Memory: Minimal usage
└─ Cold start: ~10-20ms

Your Usage:
├─ Router updates: ~1-10 per day (IP changes)
├─ Cron triggers: 288 per day (every 5 minutes)
└─ Total: ~300 requests/day
    │
    └─ Well within free tier limits! ✓
```

## Failure Modes & Recovery

### Router Offline

```
Router goes offline
│
└─ Cron trigger continues running
    │
    ├─ Checks IP every 5 minutes
    ├─ Updates DNS if changed
    │
    └─ Result: DNS stays current
```

### Worker Unavailable

```
Worker temporarily down
│
├─ Cloudflare handles failover
├─ Request retried automatically
│
└─ Alternative: Cron catches up on next run
```

### DNS API Failure

```
Cloudflare DNS API error
│
├─ Worker logs error
├─ Returns "911" to router
│
└─ Next attempt:
    ├─ Router retries (depends on router)
    └─ Cron retries in 5 minutes
```

## Monitoring Points

```
Health Check Endpoint
├─ /health
└─ Returns: {"status": "ok", "service": "cloudflare-ddns"}

Live Logs
├─ Command: wrangler tail
└─ Shows:
    ├─ Incoming requests
    ├─ Authentication attempts
    ├─ DNS updates
    └─ Errors

Cloudflare Dashboard
├─ Shows: Request count, errors, response times
└─ Location: Workers dashboard
```

## Network Topology

```
Internet
   │
   │ Public IP: 203.0.113.1
   │
   ▼
┌─────────────────────────────┐
│  ISP Router/Modem           │
│  (Provides public IP)       │
└──────────────┬──────────────┘
               │
               │
   ┌───────────┴───────────┐
   │  TripMate Nano Router │
   │  10.31.20.21          │
   │  255.255.255.0        │
   └───────────┬───────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────┐      ┌──────────┐
│ Device 1 │      │ Device 2 │
│ .22      │      │ .23      │
└──────────┘      └──────────┘

DHCP Pool: 10.31.20.22 - 10.31.20.71
```

## Deployment Architecture

```
Development:
├─ Your Computer
│  ├─ Edit code
│  ├─ Test locally: wrangler dev
│  └─ Deploy: wrangler deploy
│
▼
Cloudflare Edge Network:
├─ Worker deployed to 300+ locations worldwide
├─ Runs on V8 isolates (not containers)
├─ Auto-scales to demand
└─ Near-instant global deployment
```

---

## Summary

This DDNS system provides:

✅ **Reliable**: Dual update methods  
✅ **Fast**: 2-minute DNS propagation  
✅ **Secure**: Encrypted secrets, HTTPS-only  
✅ **Scalable**: Cloudflare's global network  
✅ **Simple**: Standard DDNS protocol  
✅ **Monitored**: Health checks and live logs  

The architecture is designed for maximum reliability with minimal complexity!
