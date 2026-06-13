# Deployment Checklist

Use this checklist to ensure everything is configured correctly before deploying.

## Pre-Deployment

- [ ] Node.js and npm installed
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Cloudflare account created
- [ ] Domain added to Cloudflare account

## Cloudflare Setup

- [ ] Retrieved Zone ID from Cloudflare dashboard
- [ ] Created API token with DNS edit permissions
- [ ] Verified API token works

## Project Setup

- [ ] Cloned/downloaded repository
- [ ] Ran `npm install`
- [ ] Updated `DDNS_HOSTNAME` in `wrangler.toml`
- [ ] Set all four secrets:
  - [ ] `CLOUDFLARE_API_TOKEN`
  - [ ] `CLOUDFLARE_ZONE_ID`
  - [ ] `DDNS_USERNAME`
  - [ ] `DDNS_PASSWORD`

## Deployment

- [ ] Logged into Wrangler (`wrangler login`)
- [ ] Deployed worker (`npm run deploy`)
- [ ] Noted worker URL from deployment output
- [ ] Tested health endpoint: `curl https://your-worker-url/health`

## Router Configuration

- [ ] Accessed router admin panel (http://10.31.20.21)
- [ ] Located DDNS settings
- [ ] Configured:
  - [ ] Server URL
  - [ ] Hostname
  - [ ] Username
  - [ ] Password
- [ ] Saved settings
- [ ] Clicked "Register" or "Update Now"

## Verification

- [ ] Router shows "Connected" or "Success" status
- [ ] DNS resolves correctly: `nslookup router.yourdomain.com`
- [ ] DNS shows current public IP: `curl https://api.ipify.org`
- [ ] Can see update logs: `wrangler tail`
- [ ] Cron trigger working (check logs after 5 minutes)

## Optional Enhancements

- [ ] Configured port forwarding for remote access
- [ ] Set up GitHub repository
- [ ] Enabled GitHub Actions (if using)
- [ ] Adjusted cron frequency (if needed)
- [ ] Enabled Cloudflare proxy (if desired)
- [ ] Set up monitoring/alerts

## Troubleshooting Complete?

- [ ] Reviewed README.md troubleshooting section
- [ ] Reviewed TRIPMATE_SETUP.md troubleshooting
- [ ] Worker logs showing successful updates
- [ ] Router DDNS status showing success

## Documentation Review

- [ ] Read through README.md
- [ ] Read through QUICKSTART.md
- [ ] Read through TRIPMATE_SETUP.md
- [ ] Bookmarked PROJECT_SUMMARY.md for reference

---

**All done?** You now have a production-ready DDNS service! 🎉

## Maintenance

Regular tasks:
- Monitor worker logs occasionally
- Verify DNS updates when IP changes
- Update worker code if needed: `npm run deploy`
- Rotate passwords periodically for security

## Support

If you encounter issues:
1. Check worker logs: `wrangler tail`
2. Review troubleshooting guides
3. Test manually with curl
4. Verify credentials are correct
