# Research: Custom Domain and Email Configuration

## Overview
This document captures research for configuring crypto-tracker.uk as the custom domain with proper email authentication.

## 1. Vercel Custom Domain Configuration

### Domain Setup
- **Vercel Dashboard**: Add custom domain via Project Settings → Domains
- **DNS Requirements**:
  - A record: `crypto-tracker.uk` → Vercel's IP (76.76.21.21)
  - CNAME record: `www.crypto-tracker.uk` → `cname.vercel-dns.com`
- **SSL/TLS**: Automatic via Let's Encrypt (auto-renewal every 60 days)
- **Propagation**: Typically 10min-24hr depending on DNS provider

### Redirect Configuration
- **Built-in Vercel Redirects**: Configure in `vercel.json` or `next.config.ts`
- **Permanent Redirects (301)**:
  - Old Vercel subdomain → new custom domain
  - www → non-www
- **Middleware Alternative**: Next.js middleware for dynamic redirect logic (overkill for simple redirects)

**Recommendation**: Use `vercel.json` for declarative redirects - simpler and performs at edge level.

## 2. Next.js Environment Configuration

### Environment Variables
Current setup uses:
- `NEXT_PUBLIC_SITE_URL` - Base URL for absolute links (currently Vercel subdomain)
- OAuth callback URLs in Supabase dashboard

**Required Updates**:
1. Update `NEXT_PUBLIC_SITE_URL` to `https://crypto-tracker.uk` in Vercel environment variables
2. Maintain separate values for preview/development environments
3. Update OAuth callback URLs in Supabase Auth settings

### Dynamic Base URL
- Use `process.env.NEXT_PUBLIC_SITE_URL` consistently across codebase
- Avoid hardcoded domain references
- Validate no hardcoded `vercel.app` URLs remain

## 3. Supabase Email Configuration

### Built-in Email Service (SMTP)
Supabase provides SMTP service for auth emails, configurable via:
- **Dashboard**: Project Settings → Auth → Email Templates
- **Custom SMTP**: Project Settings → Auth → SMTP Settings

### DNS Records for Email Authentication

#### SPF (Sender Policy Framework)
- **Purpose**: Authorizes mail servers to send on behalf of domain
- **Record Type**: TXT
- **Example**: `v=spf1 include:_spf.supabase.co ~all`
- **Verification**: `dig txt crypto-tracker.uk` or online SPF checker

#### DKIM (DomainKeys Identified Mail)
- **Purpose**: Cryptographic signature proving email authenticity
- **Configuration**: Supabase provides DKIM keys in SMTP settings
- **Record Type**: TXT (subdomain: `supabase._domainkey.crypto-tracker.uk`)
- **Format**: Supabase-generated public key

#### DMARC (Domain-based Message Authentication)
- **Purpose**: Policy for handling failed SPF/DKIM checks
- **Policy Level**: `p=none` (monitoring only, per clarifications)
- **Record**: `_dmarc.crypto-tracker.uk`
- **Example**: `v=DMARC1; p=none; rua=mailto:dmarc-reports@crypto-tracker.uk; pct=100`
- **Reports**: Aggregate reports sent to specified email (can use external service like Postmark DMARC Digest)

### Email Sender Configuration
- **From Address**: `noreply@crypto-tracker.uk`
- **Reply-To**: Can be set to support email if needed (future)
- **Templates**: Update Supabase email templates to reference new domain

## 4. Testing Strategy

### DNS Verification Tools
- `dig` / `nslookup` - Command-line DNS lookup
- [DNS Checker](https://dnschecker.org) - Global propagation verification
- [MX Toolbox](https://mxtoolbox.com) - SPF/DKIM/DMARC validation

### SSL Certificate Validation
- Browser security indicator (padlock icon)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/) - Comprehensive SSL analysis
- Verify certificate auto-renewal logs in Vercel

### Redirect Testing
- Manual browser tests (HTTP → HTTPS, www → non-www, old → new domain)
- Automated E2E tests with Playwright:
  - Navigate to old domain, assert redirect to new
  - Navigate to www variant, assert redirect to non-www
  - Verify 301 status codes

### Email Deliverability Testing
- Send test auth email (password reset)
- Check SPF/DKIM headers in received email
- Monitor DMARC reports for first 7 days
- [Mail-tester](https://www.mail-tester.com) - Spam score check

## 5. Migration Risks & Mitigation

### Risk: OAuth Callback Mismatch
- **Impact**: Login failures if callbacks point to old domain
- **Mitigation**: Update all OAuth providers (Google, etc.) with new callback URLs simultaneously
- **Testing**: Full OAuth flow in staging before production

### Risk: DNS Propagation Delay
- **Impact**: Users may hit old domain for up to 24 hours
- **Mitigation**: 
  - Keep old domain active and redirecting
  - Lower TTL to 300s (5 min) 24 hours before migration
  - Monitor traffic to both domains

### Risk: Email Delivery Failures
- **Impact**: Users don't receive auth emails during transition
- **Mitigation**:
  - Configure email DNS records 48 hours before domain switch
  - Monitor Supabase email logs
  - Have rollback plan (revert to Supabase default sender)

### Risk: Session Loss
- **Impact**: Users logged out during migration
- **Mitigation**:
  - Supabase sessions are domain-independent (stored in localStorage with project ref)
  - No session loss expected, but test in staging

### Risk: SSL Certificate Delay
- **Impact**: Brief HTTPS error if cert not ready
- **Mitigation**:
  - Vercel provisions certs within minutes of domain addition
  - Add domain first, verify cert before updating DNS
  - Monitor Vercel deployment logs

## 6. Rollback Plan

If critical issues occur:
1. **DNS Rollback**: Remove A/CNAME records → traffic returns to old domain
2. **Environment Variables**: Revert `NEXT_PUBLIC_SITE_URL` to old domain
3. **OAuth Callbacks**: Revert to old callback URLs
4. **Email**: Supabase automatically falls back to default sender if custom domain fails

**Rollback Time**: <15 minutes (DNS cache may persist longer)

## 7. Staging Environment Setup

### Requirements
- Separate Vercel project for staging (or preview deployment)
- Test subdomain: e.g., `staging.crypto-tracker.uk` or use Vercel preview URLs
- Separate Supabase project (or same project with staging OAuth app)
- Full E2E test suite run against staging

### Validation Checklist
- [ ] DNS resolves correctly (A, CNAME, TXT records)
- [ ] SSL certificate valid and trusted
- [ ] All redirects work (old → new, www → non-www)
- [ ] OAuth login flow completes successfully
- [ ] Email delivery works with proper authentication
- [ ] SPF/DKIM/DMARC records validate
- [ ] No hardcoded old domain references in app
- [ ] Session persistence across domain (if applicable)

## 8. Documentation Requirements

### For Operations Team
- DNS record values and propagation timeline
- Vercel domain configuration steps
- Supabase SMTP/email setup process
- Monitoring/alerting for email deliverability

### For Development Team
- Environment variable updates
- OAuth provider configuration changes
- Testing procedures for domain changes
- Rollback procedures

## 9. External Dependencies

- **DNS Provider**: Access to crypto-tracker.uk DNS management (e.g., Cloudflare, Google Domains, Namecheap)
- **Vercel**: Project owner/admin access
- **Supabase**: Project owner access for SMTP configuration
- **OAuth Providers**: Admin access to update callback URLs (Google, etc.)

## 10. Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| DNS record creation | 30 min | SPF, DKIM, DMARC setup |
| Vercel domain addition | 15 min | SSL cert auto-provisions |
| Environment variable updates | 15 min | Across all environments |
| OAuth callback updates | 30 min | Per provider |
| Testing in staging | 2 hours | Full validation |
| Production deployment | 1 hour | Including monitoring |
| DNS propagation monitoring | 24 hours | Passive monitoring |
| **Total Active Work** | ~5 hours | Not including propagation |

## Research Completion Status
- [x] Vercel custom domain configuration researched
- [x] DNS requirements identified
- [x] Email authentication (SPF/DKIM/DMARC) researched
- [x] Supabase email configuration documented
- [x] Testing strategy defined
- [x] Risk mitigation planned
- [x] Rollback procedures documented
- [x] Staging validation checklist created
- [x] No blocking unknowns remain
