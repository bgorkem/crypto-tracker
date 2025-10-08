# Quickstart: Custom Domain and Email Configuration

## Purpose
This quickstart guide provides step-by-step instructions to configure and validate the custom domain crypto-tracker.uk with email authentication.

## Prerequisites
- [ ] Access to crypto-tracker.uk DNS management (Cloudflare, Google Domains, or other provider)
- [ ] Vercel project owner/admin access
- [ ] Supabase project owner access
- [ ] OAuth provider admin access (Google, etc.)
- [ ] Command-line tools: `dig`, `curl`, `git`

---

## Phase 1: DNS Configuration (30 minutes)

### Step 1.1: Add A Record
In your DNS provider dashboard:
```
Type:  A
Name:  @  (or crypto-tracker.uk)
Value: 76.76.21.21  (Vercel's IP)
TTL:   300 (5 minutes)
```

**Verification**:
```bash
dig A crypto-tracker.uk
# Expected: 76.76.21.21 in ANSWER section
```

### Step 1.2: Add CNAME Record for WWW
```
Type:  CNAME
Name:  www
Value: cname.vercel-dns.com
TTL:   300
```

**Verification**:
```bash
dig CNAME www.crypto-tracker.uk
# Expected: cname.vercel-dns.com
```

### Step 1.3: Add SPF Record
```
Type:  TXT
Name:  @  (or crypto-tracker.uk)
Value: v=spf1 include:_spf.supabase.co ~all
TTL:   300
```

**Verification**:
```bash
dig TXT crypto-tracker.uk | grep spf
# Expected: v=spf1 include:_spf.supabase.co ~all
```

### Step 1.4: Add DKIM Record
> Note: Get DKIM public key from Supabase dashboard first

1. Go to Supabase Dashboard → Project Settings → Auth → SMTP Settings
2. Copy the DKIM public key value
3. Add DNS record:
```
Type:  TXT
Name:  supabase._domainkey
Value: v=DKIM1; k=rsa; p=<public-key-from-supabase>
TTL:   300
```

**Verification**:
```bash
dig TXT supabase._domainkey.crypto-tracker.uk
# Expected: v=DKIM1; k=rsa; p=...
```

### Step 1.5: Add DMARC Record
```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@crypto-tracker.uk; pct=100
TTL:   300
```

**Verification**:
```bash
dig TXT _dmarc.crypto-tracker.uk
# Expected: v=DMARC1; p=none; rua=...
```

---

## Phase 2: Vercel Configuration (15 minutes)

### Step 2.1: Add Custom Domain
1. Open Vercel Dashboard
2. Navigate to your project → Settings → Domains
3. Click "Add Domain"
4. Enter: `crypto-tracker.uk`
5. Click "Add"
6. Wait for SSL certificate provisioning (usually < 5 minutes)

**Verification**:
- Check domain status shows "Active" with green checkmark
- Visit `https://crypto-tracker.uk` in browser (may show 404 until env vars updated)
- Verify SSL certificate is valid (padlock icon in browser)

### Step 2.2: Configure Redirects
Create or update `vercel.json` in project root:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "crypto-tracker-seven-lake.vercel.app"
        }
      ],
      "destination": "https://crypto-tracker.uk/:path*",
      "permanent": true
    },
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.crypto-tracker.uk"
        }
      ],
      "destination": "https://crypto-tracker.uk/:path*",
      "permanent": true
    }
  ]
}
```

Commit and push:
```bash
git add vercel.json
git commit -m "Add custom domain redirects"
git push origin 002-configure-custom-domain
```

**Verification**:
```bash
# Test old domain redirect
curl -I https://crypto-tracker-seven-lake.vercel.app
# Expected: 301, Location: https://crypto-tracker.uk/

# Test www redirect
curl -I https://www.crypto-tracker.uk
# Expected: 301, Location: https://crypto-tracker.uk/
```

---

## Phase 3: Environment Variables (15 minutes)

### Step 3.1: Update Vercel Environment Variables
1. Vercel Dashboard → Project Settings → Environment Variables
2. Find `NEXT_PUBLIC_SITE_URL`
3. Update value:
   - **Production**: `https://crypto-tracker.uk`
   - **Preview**: Keep as Vercel preview URL
   - **Development**: Keep as `http://localhost:3000`

### Step 3.2: Redeploy
Trigger a new deployment to pick up environment variable changes:
```bash
git commit --allow-empty -m "Trigger redeploy with new env vars"
git push origin 002-configure-custom-domain
```

**Verification**:
1. Wait for deployment to complete
2. Open browser DevTools → Console
3. Run: `console.log(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin)`
4. Expected: `https://crypto-tracker.uk`

---

## Phase 4: Supabase Email Configuration (30 minutes)

### Step 4.1: Configure Custom SMTP
1. Supabase Dashboard → Project Settings → Auth → SMTP Settings
2. Enable "Custom SMTP"
3. Configure sender:
   - **Sender email**: `noreply@crypto-tracker.uk`
   - **Sender name**: `Crypto Tracker`
4. Save settings

### Step 4.2: Update Email Templates
1. Go to Auth → Email Templates
2. Update each template (Confirm signup, Reset password, etc.):
   - Replace any hardcoded domain references with `{{ .SiteURL }}`
   - Ensure from address shows `noreply@crypto-tracker.uk`
3. Save each template

### Step 4.3: Test Email Delivery
1. Open app in incognito window
2. Click "Sign up" or "Reset password"
3. Enter test email address
4. Check inbox for email from `noreply@crypto-tracker.uk`

**Verification**:
- Email received from `noreply@crypto-tracker.uk`
- Links point to `https://crypto-tracker.uk`
- Check email headers for SPF/DKIM pass:
  ```
  Authentication-Results: spf=pass; dkim=pass
  ```

---

## Phase 5: OAuth Callback Updates (30 minutes)

### Step 5.1: Update Google OAuth
1. Google Cloud Console → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   - `https://crypto-tracker.uk/auth/callback`
4. Remove old Vercel URL (after testing)

### Step 5.2: Test OAuth Flow
1. Open `https://crypto-tracker.uk` in incognito
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify successful redirect and login

**Verification**:
- No redirect URI mismatch errors
- User successfully logged in
- Session persists after login

---

## Phase 6: End-to-End Validation (2 hours)

### Test Checklist

#### Domain & SSL
- [ ] `https://crypto-tracker.uk` loads with valid SSL
- [ ] `http://crypto-tracker.uk` redirects to HTTPS (301)
- [ ] `https://www.crypto-tracker.uk` redirects to non-www (301)
- [ ] Old Vercel URL redirects to custom domain (301)
- [ ] SSL certificate expires > 30 days from now

#### DNS Records
- [ ] A record resolves correctly
- [ ] CNAME record for www resolves
- [ ] SPF record present and valid
- [ ] DKIM record present and valid
- [ ] DMARC record present with p=none

#### Email Delivery
- [ ] Password reset email received
- [ ] Email from `noreply@crypto-tracker.uk`
- [ ] SPF passes (check headers)
- [ ] DKIM passes (check headers)
- [ ] Links in email point to custom domain
- [ ] Email not marked as spam

#### Authentication
- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Password reset flow completes
- [ ] Email verification flow completes
- [ ] Sessions persist correctly

#### Application Functionality
- [ ] All pages load correctly
- [ ] API endpoints respond
- [ ] Real-time features work
- [ ] No console errors related to domain
- [ ] No hardcoded old domain references

---

## Phase 7: Production Deployment

### Pre-Deployment Checklist
- [ ] All staging tests pass
- [ ] DNS propagation verified (use dnschecker.org)
- [ ] SSL certificate active and valid
- [ ] Rollback plan documented and ready
- [ ] Team notified of deployment window

### Deployment Steps
1. Merge feature branch to main:
   ```bash
   git checkout main
   git merge 002-configure-custom-domain
   git push origin main
   ```

2. Monitor deployment in Vercel dashboard

3. Verify production deployment:
   - Visit `https://crypto-tracker.uk`
   - Complete full test checklist above

### Post-Deployment Monitoring (24 hours)
- [ ] Monitor traffic split between old/new domains
- [ ] Check email deliverability rates
- [ ] Monitor DMARC reports
- [ ] Watch for SSL cert auto-renewal logs
- [ ] Monitor error rates and user reports

---

## Rollback Procedure

If critical issues occur:

1. **Revert Environment Variables** (Vercel Dashboard):
   - Change `NEXT_PUBLIC_SITE_URL` back to old Vercel URL
   - Redeploy

2. **Revert OAuth Callbacks**:
   - Re-add old callback URLs in provider dashboards

3. **Remove DNS Records** (or lower TTL to 60s):
   - This returns traffic to old domain after cache expires

4. **Revert Code Changes**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

**Expected Rollback Time**: 15 minutes (plus DNS cache TTL)

---

## Success Criteria

✅ Feature is complete when:
- Custom domain loads with valid SSL
- All redirects work correctly (old → new, www → non-www)
- Email delivery from custom domain with SPF/DKIM/DMARC passing
- OAuth flows complete successfully
- No user-facing errors or broken functionality
- DNS propagation complete within 24 hours
- All automated tests passing

---

## Support & Troubleshooting

### Common Issues

**Issue**: DNS not resolving
- **Solution**: Wait up to 24 hours for propagation, check TTL values

**Issue**: SSL certificate not provisioning
- **Solution**: Verify DNS A record points to Vercel, check Vercel logs

**Issue**: Email delivery failing
- **Solution**: Verify SPF/DKIM records, check Supabase logs

**Issue**: OAuth callback mismatch
- **Solution**: Ensure callback URL exactly matches provider configuration

### Useful Tools
- [DNS Checker](https://dnschecker.org) - Global DNS propagation
- [MX Toolbox](https://mxtoolbox.com/SuperTool.aspx) - Email auth validation
- [SSL Labs](https://www.ssllabs.com/ssltest/) - SSL certificate analysis
- [Mail Tester](https://www.mail-tester.com) - Email spam score

---

**Estimated Total Time**: 5-6 hours active work + 24 hours DNS propagation monitoring
