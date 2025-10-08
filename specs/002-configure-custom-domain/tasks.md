# Tasks: Custom Domain and Email Configuration

**Input**: Design documents from `/specs/002-configure-custom-domain/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extracted: TypeScript 5.x, Next.js 15.5, Vercel, Supabase
   ✓ Structure: Web application (configuration-heavy)
2. Load optional design documents:
   ✓ data-model.md: Configuration entities (no DB changes)
   ✓ contracts/config-validation.md: DNS, SSL, redirects, email validation
   ✓ research.md: Vercel + Supabase + DNS configuration strategy
   ✓ quickstart.md: 7-phase deployment guide with validation
3. Generate tasks by category:
   ✓ Setup: DNS records, Vercel config, environment variables
   ✓ Tests: Contract tests for validation (DNS, SSL, redirects, email)
   ✓ Implementation: Configuration files, redirect rules
   ✓ Integration: Staging deployment and validation
   ✓ Production: Final deployment and monitoring
4. Apply task rules:
   ✓ Infrastructure tasks sequential (DNS must complete first)
   ✓ Configuration tasks parallel [P] (independent)
   ✓ Contract tests parallel [P] (different validation areas)
5. Number tasks sequentially (T001-T023)
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness:
   ✓ All contracts have validation tests
   ✓ All configuration verified in staging
   ✓ Rollback procedures documented
   ✓ 24-hour monitoring period included
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different infrastructure, no dependencies)
- Include exact file paths and configuration locations in descriptions

## Path Conventions
This is a configuration-heavy feature. Paths reference:
- Configuration files: `vercel.json`, `.env.example`
- Test files: `__tests__/contract/`, `__tests__/e2e/`
- Documentation: `specs/002-configure-custom-domain/`

---

## Phase 3.1: Infrastructure Setup (Sequential - Must Complete First)

### DNS Configuration (External - DNS Provider Dashboard)
- [ ] **T001** Add A record for crypto-tracker.uk pointing to Vercel IP (76.76.21.21), TTL 300s
  - Verify with: `dig A crypto-tracker.uk`
  - Expected: 76.76.21.21 in ANSWER section

- [ ] **T002** Add CNAME record for www.crypto-tracker.uk pointing to cname.vercel-dns.com, TTL 300s
  - Verify with: `dig CNAME www.crypto-tracker.uk`
  - Expected: cname.vercel-dns.com

- [ ] **T003** Add SPF TXT record: `v=spf1 include:_spf.supabase.co ~all`
  - Verify with: `dig TXT crypto-tracker.uk | grep spf`
  - Expected: SPF record present

- [ ] **T004** Configure Supabase SMTP and retrieve DKIM public key
  - Location: Supabase Dashboard → Project Settings → Auth → SMTP Settings
  - Copy DKIM public key for next step

- [ ] **T005** Add DKIM TXT record at supabase._domainkey.crypto-tracker.uk with Supabase public key
  - Verify with: `dig TXT supabase._domainkey.crypto-tracker.uk`
  - Expected: v=DKIM1; k=rsa; p=<key>

- [ ] **T006** Add DMARC TXT record at _dmarc.crypto-tracker.uk: `v=DMARC1; p=none; rua=mailto:dmarc-reports@crypto-tracker.uk; pct=100`
  - Verify with: `dig TXT _dmarc.crypto-tracker.uk`
  - Expected: DMARC record with p=none

### Vercel Configuration (Vercel Dashboard)
- [ ] **T007** Add custom domain crypto-tracker.uk in Vercel project settings
  - Location: Vercel Dashboard → Project → Settings → Domains
  - Wait for SSL certificate provisioning (usually <5 min)
  - Verify: Green checkmark on domain status

---

## Phase 3.2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY configuration deployment**

- [ ] **T008** [P] DNS validation contract test in `__tests__/contract/dns-validation.test.ts`
  - Test A record resolution for crypto-tracker.uk
  - Test CNAME record for www subdomain
  - Test SPF record contains Supabase include
  - Test DKIM record structure and presence
  - Test DMARC record with p=none policy
  - Use Node.js `dns` module for validation

- [ ] **T009** [P] SSL certificate validation contract test in `__tests__/contract/ssl-certificate.test.ts`
  - Test HTTPS connection to crypto-tracker.uk
  - Verify certificate issuer (Let's Encrypt)
  - Verify certificate expiry >30 days
  - Verify no browser certificate warnings
  - Use Node.js `https` module or `tls` for validation

- [ ] **T010** [P] Redirect validation contract test in `__tests__/contract/redirects.test.ts`
  - Test old Vercel domain → custom domain (301 redirect)
  - Test www → non-www redirect (301)
  - Test HTTP → HTTPS redirect (301)
  - Test query params preserved across redirects
  - Test path preservation in redirects
  - Use `fetch` or `axios` with redirect: 'manual'

- [ ] **T011** [P] Email delivery contract test in `__tests__/contract/email-delivery.test.ts`
  - Trigger test email from Supabase (password reset)
  - Verify sender address: noreply@crypto-tracker.uk
  - Parse email headers for SPF=pass, DKIM=pass
  - Verify links in email point to custom domain
  - Check email not flagged as spam
  - May require manual verification initially

- [ ] **T012** [P] OAuth callback contract test in `__tests__/contract/oauth-callback.test.ts`
  - Test Google OAuth flow with custom domain callback
  - Verify callback URL: https://crypto-tracker.uk/auth/callback
  - Test successful authentication and redirect
  - Verify no CORS or callback mismatch errors
  - Use Playwright for E2E OAuth flow

---

## Phase 3.3: Configuration Implementation (After Tests Written)

### Code Configuration Files
- [ ] **T013** [P] Update `vercel.json` with redirect rules
  ```json
  {
    "redirects": [
      {
        "source": "/:path*",
        "has": [{"type": "host", "value": "crypto-tracker-seven-lake.vercel.app"}],
        "destination": "https://crypto-tracker.uk/:path*",
        "permanent": true
      },
      {
        "source": "/:path*",
        "has": [{"type": "host", "value": "www.crypto-tracker.uk"}],
        "destination": "https://crypto-tracker.uk/:path*",
        "permanent": true
      }
    ]
  }
  ```
  - Test locally if possible, otherwise validate in preview deployment

- [ ] **T014** [P] Update `.env.example` with NEXT_PUBLIC_SITE_URL documentation
  ```
  # Production
  NEXT_PUBLIC_SITE_URL=https://crypto-tracker.uk
  # Staging  
  NEXT_PUBLIC_SITE_URL=https://staging-crypto-tracker.vercel.app
  # Development
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

- [ ] **T015** [P] Audit codebase for hardcoded domain references
  - Search for "crypto-tracker-seven-lake.vercel.app" in codebase
  - Replace with `process.env.NEXT_PUBLIC_SITE_URL` or environment variable
  - Verify no hardcoded old domain URLs remain
  - Check: API calls, OAuth redirects, email templates

### Vercel Environment Variables (Vercel Dashboard)
- [ ] **T016** Update NEXT_PUBLIC_SITE_URL environment variable in Vercel
  - Production: `https://crypto-tracker.uk`
  - Preview: Keep as Vercel preview URLs
  - Development: Keep as `http://localhost:3000`
  - Location: Vercel Dashboard → Project → Settings → Environment Variables

### Supabase Configuration (Supabase Dashboard)
- [ ] **T017** [P] Configure custom SMTP sender in Supabase
  - Location: Supabase Dashboard → Project Settings → Auth → SMTP Settings
  - Sender email: `noreply@crypto-tracker.uk`
  - Sender name: `Crypto Tracker`
  - Save settings

- [ ] **T018** [P] Update Supabase email templates with custom domain
  - Templates: Confirm signup, Reset password, Magic link, etc.
  - Replace domain references with `{{ .SiteURL }}`
  - Verify from address: `noreply@crypto-tracker.uk`
  - Test: Send test email and verify links

### OAuth Provider Updates (External)
- [ ] **T019** Update Google OAuth authorized redirect URIs
  - Location: Google Cloud Console → APIs & Services → Credentials
  - Add: `https://crypto-tracker.uk/auth/callback`
  - Test OAuth flow before removing old URL
  - Remove old Vercel URL after validation

---

## Phase 3.4: Staging Validation & Integration

- [ ] **T020** Deploy configuration to staging/preview environment
  - Create PR with changes (vercel.json, .env.example, code updates)
  - Vercel auto-deploys preview
  - Wait for deployment completion
  - Note preview URL for testing

- [ ] **T021** Run full contract test suite in staging
  - Execute all contract tests (T008-T012) against staging
  - Verify DNS resolution (if staging has custom subdomain)
  - Verify SSL certificate valid
  - Verify redirects working correctly
  - Test email delivery from staging
  - Test OAuth flow in staging
  - Fix any failing tests before proceeding

- [ ] **T022** Execute quickstart validation checklist in staging
  - Follow `specs/002-configure-custom-domain/quickstart.md`
  - Complete Phase 6: End-to-End Validation section
  - Verify all items in Test Checklist
  - Document any issues or deviations
  - Ensure 100% pass before production

---

## Phase 3.5: Production Deployment

- [ ] **T023** Merge feature branch to main and deploy to production
  - Ensure all staging tests pass
  - Merge PR: `002-configure-custom-domain` → `main`
  - Vercel auto-deploys to production
  - Monitor deployment logs for errors
  - Verify production deployment completes successfully

- [ ] **T024** Production smoke test (immediate verification)
  - Visit https://crypto-tracker.uk (verify loads with SSL)
  - Test old domain redirect: https://crypto-tracker-seven-lake.vercel.app
  - Test www redirect: https://www.crypto-tracker.uk
  - Complete one full user flow (signup or login)
  - Send test email (password reset)
  - Verify OAuth login works
  - Check browser console for errors

---

## Phase 3.6: Monitoring & Validation (24-48 hours)

- [ ] **T025** Monitor DNS propagation globally
  - Use https://dnschecker.org to check global propagation
  - Verify A, CNAME, SPF, DKIM, DMARC records visible worldwide
  - Expected: Full propagation within 24 hours
  - Document any regions with slow propagation

- [ ] **T026** Monitor email deliverability metrics
  - Check Supabase logs for email delivery rates
  - Monitor DMARC aggregate reports (if configured)
  - Verify deliverability ≥95% (per NFR-003)
  - Address any spam flags or delivery issues

- [ ] **T027** Monitor SSL certificate auto-renewal setup
  - Verify Vercel has auto-renewal configured
  - Check certificate expiry date (should be ~90 days)
  - Set up monitoring alert for cert expiry <30 days
  - Document renewal process in runbook

- [ ] **T028** Document rollback procedures and post-deployment notes
  - Update deployment documentation with actual timeline
  - Document any issues encountered and resolutions
  - Create runbook for future domain changes
  - Archive all validation results and logs

---

## Dependencies

### Sequential Dependencies (Must Complete in Order)
1. **DNS Setup** (T001-T006) → **Vercel Configuration** (T007)
   - DNS records must exist before Vercel can verify domain
   
2. **Infrastructure** (T001-T007) → **Contract Tests** (T008-T012)
   - Tests validate infrastructure configuration

3. **Contract Tests** (T008-T012) → **Configuration** (T013-T019)
   - Tests must be written (and failing) before implementation (TDD)

4. **Configuration** (T013-T019) → **Staging** (T020-T022)
   - All config must be ready before staging deployment

5. **Staging Validation** (T020-T022) → **Production** (T023-T024)
   - All staging tests must pass before production deployment

6. **Production Deployment** (T023-T024) → **Monitoring** (T025-T028)
   - Monitoring starts after production is live

### Parallel Execution Groups

**Group 1: DNS Records** (can run in parallel once DNS provider access confirmed)
- T001, T002, T003 [P] - Different DNS records, no dependencies

**Group 2: Email DNS + Config** (after Supabase SMTP setup)
- T004 → T005, T006 [P] - T004 must complete first to get DKIM key

**Group 3: Contract Tests** (all independent)
- T008, T009, T010, T011, T012 [P] - Different test files, no shared state

**Group 4: Configuration Files** (all independent)
- T013, T014, T015 [P] - Different files in codebase

**Group 5: External Configurations** (all independent)
- T017, T018, T019 [P] - Different external dashboards

## Parallel Execution Examples

### Execute DNS records in parallel:
```bash
# Terminal 1
Task: "Add A record for crypto-tracker.uk → 76.76.21.21, TTL 300s"

# Terminal 2  
Task: "Add CNAME record for www.crypto-tracker.uk → cname.vercel-dns.com"

# Terminal 3
Task: "Add SPF TXT record: v=spf1 include:_spf.supabase.co ~all"
```

### Execute contract tests in parallel:
```bash
# Launch all 5 contract tests together
npm test __tests__/contract/dns-validation.test.ts &
npm test __tests__/contract/ssl-certificate.test.ts &
npm test __tests__/contract/redirects.test.ts &
npm test __tests__/contract/email-delivery.test.ts &
npm test __tests__/contract/oauth-callback.test.ts &
wait
```

### Execute configuration updates in parallel:
```bash
# Terminal 1: Update vercel.json
Task: "Add redirect rules to vercel.json"

# Terminal 2: Update environment docs
Task: "Update .env.example with NEXT_PUBLIC_SITE_URL"

# Terminal 3: Code audit
Task: "Search and replace hardcoded domain references"
```

## Notes

### Configuration vs Code
This feature is **90% configuration, 10% code**. Most tasks involve:
- External dashboards (DNS provider, Vercel, Supabase, Google Cloud)
- Configuration files (vercel.json, environment variables)
- Validation tests (contract tests to verify config)

Minimal application code changes are needed.

### Critical Success Factors
1. ✅ DNS records must be correct before Vercel domain addition
2. ✅ All contract tests must be written and failing before configuration
3. ✅ Staging validation must be 100% before production
4. ✅ 24-hour monitoring period required after production deployment

### Rollback Plan
If critical issues occur at any stage:
1. **Revert Vercel env vars** → old domain URL
2. **Revert OAuth callbacks** → old domain callbacks  
3. **Remove DNS records** (or lower TTL to 60s)
4. **Revert code changes** → git revert
5. **Expected rollback time**: 15 minutes + DNS cache TTL

### Time Estimates
- **DNS Setup** (T001-T007): 1 hour
- **Contract Tests** (T008-T012): 3 hours
- **Configuration** (T013-T019): 2 hours
- **Staging Validation** (T020-T022): 2 hours
- **Production Deploy** (T023-T024): 1 hour
- **Monitoring** (T025-T028): 24-48 hours (passive)
- **Total Active Work**: ~9 hours
- **Total Calendar Time**: 2-3 days (including DNS propagation)

### Success Criteria
Feature complete when:
- ✅ All 28 tasks completed
- ✅ Custom domain loads with valid SSL
- ✅ All redirects return 301 status codes
- ✅ Email delivery from noreply@crypto-tracker.uk with SPF/DKIM pass
- ✅ OAuth flows complete successfully
- ✅ DNS propagated globally within 24 hours
- ✅ Email deliverability ≥95%
- ✅ No user-facing errors or functionality regressions
