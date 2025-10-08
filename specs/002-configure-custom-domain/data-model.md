# Data Model: Custom Domain and Email Configuration

## Overview
This feature primarily involves configuration changes rather than new data models. The entities below represent configuration metadata and validation state.

## Entities

### 1. Domain Configuration (Infrastructure, not DB entity)

**Purpose**: Represents custom domain settings and validation status

**Attributes**:
- `domain_name`: string - The custom domain (e.g., "crypto-tracker.uk")
- `is_primary`: boolean - Whether this is the canonical domain
- `ssl_status`: enum - ["pending", "active", "expiring", "failed"]
- `ssl_expires_at`: datetime - SSL certificate expiration
- `dns_configured`: boolean - Whether DNS records are properly set
- `last_validated`: datetime - Last DNS validation check
- `redirect_rules`: array - List of redirect configurations

**Storage**: Vercel project configuration (not in application database)

**Validation Rules**:
- `domain_name` must be valid FQDN format
- `ssl_status` must be "active" for production use
- DNS must resolve correctly before marking as primary

**State Transitions**:
```
pending → active (when DNS configured and SSL cert issued)
active → expiring (when cert < 30 days from expiry)
expiring → active (when cert renewed)
active → failed (if cert renewal fails)
failed → pending (when manual intervention triggers retry)
```

---

### 2. Email Configuration (Infrastructure, not DB entity)

**Purpose**: Represents email sender settings and authentication status

**Attributes**:
- `sender_address`: string - Email address ("noreply@crypto-tracker.uk")
- `sender_name`: string - Display name for emails
- `smtp_provider`: enum - ["supabase", "sendgrid", "ses", "resend"]
- `spf_configured`: boolean - SPF record validation status
- `dkim_configured`: boolean - DKIM signature validation status
- `dmarc_policy`: enum - ["none", "quarantine", "reject"]
- `dmarc_report_email`: string - Email for DMARC aggregate reports
- `deliverability_rate`: float - Percentage of successfully delivered emails
- `last_health_check`: datetime - Last email system validation

**Storage**: Supabase project settings (Auth → SMTP configuration)

**Validation Rules**:
- `sender_address` must match domain (`@crypto-tracker.uk`)
- `spf_configured` and `dkim_configured` must be true for production
- `deliverability_rate` must be ≥ 95% (per NFR-003)

---

### 3. Environment Configuration (Application Config)

**Purpose**: Environment-specific base URLs and feature flags

**Attributes**:
- `environment`: enum - ["development", "staging", "production"]
- `base_url`: string - Application base URL
- `old_vercel_url`: string - Legacy Vercel subdomain (for redirect reference)
- `enable_custom_domain`: boolean - Feature flag
- `dns_ttl`: integer - DNS cache TTL in seconds

**Storage**: Environment variables (Vercel, .env files)

**Relationships**:
- Each environment has exactly one `base_url`
- Production environment must use custom domain when feature is enabled

---

### 4. Redirect Rule (Configuration)

**Purpose**: HTTP redirect mappings

**Attributes**:
- `source_pattern`: string - URL pattern to match (regex or exact)
- `destination`: string - Target URL
- `status_code`: integer - HTTP status (301 permanent, 302 temporary)
- `preserve_query_params`: boolean - Whether to forward query string

**Examples**:
```typescript
{
  source_pattern: "crypto-tracker-seven-lake.vercel.app/:path*",
  destination: "https://crypto-tracker.uk/:path*",
  status_code: 301,
  preserve_query_params: true
}

{
  source_pattern: "www.crypto-tracker.uk/:path*",
  destination: "https://crypto-tracker.uk/:path*",
  status_code: 301,
  preserve_query_params: true
}
```

**Storage**: `vercel.json` or `next.config.ts` redirects configuration

---

## Configuration Flow

### Initial State (Current)
- `base_url` = "https://crypto-tracker-seven-lake.vercel.app"
- No custom domain configured
- Emails sent from Supabase default sender

### Target State (After Migration)
- `base_url` = "https://crypto-tracker.uk"
- Custom domain active with SSL
- Email authentication configured (SPF, DKIM, DMARC)
- Redirects active (old → new, www → non-www)

### Migration Steps
1. Add DNS records (A, CNAME, TXT for email auth)
2. Configure custom domain in Vercel
3. Update environment variables (`NEXT_PUBLIC_SITE_URL`)
4. Configure Supabase SMTP with custom sender
5. Update OAuth callback URLs
6. Enable redirect rules
7. Validate in staging
8. Deploy to production

---

## Validation Queries

### DNS Validation (CLI)
```bash
# A record
dig A crypto-tracker.uk

# CNAME record  
dig CNAME www.crypto-tracker.uk

# SPF record
dig TXT crypto-tracker.uk

# DKIM record
dig TXT supabase._domainkey.crypto-tracker.uk

# DMARC record
dig TXT _dmarc.crypto-tracker.uk
```

### Email Authentication Check (Headers)
```
Received-SPF: pass
DKIM-Signature: v=1; a=rsa-sha256; d=crypto-tracker.uk
DMARC: pass
```

---

## No Database Schema Changes Required

This feature does not introduce new database tables or modify existing schemas. All configuration is stored in:
- Vercel project settings (domain, redirects)
- Supabase project settings (SMTP, email templates)
- Environment variables (base URLs)
- DNS provider (A, CNAME, TXT records)

The application code will read from environment variables but not persist domain configuration to the database.
