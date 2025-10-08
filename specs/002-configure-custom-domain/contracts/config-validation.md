# Configuration Validation Contract

## Purpose
Define the contract for validating domain and email configuration settings.

## DNS Configuration Contract

### A Record Validation
**Endpoint**: DNS Query (not HTTP API)
**Method**: `dig A crypto-tracker.uk`

**Expected Response**:
```
;; ANSWER SECTION:
crypto-tracker.uk.    300    IN    A    76.76.21.21
```

**Contract**:
- Status: `NOERROR`
- Answer count: ≥ 1
- Record type: `A`
- Value: Vercel's IP address (76.76.21.21 or assigned IP)

---

### CNAME Record Validation
**Endpoint**: DNS Query
**Method**: `dig CNAME www.crypto-tracker.uk`

**Expected Response**:
```
;; ANSWER SECTION:
www.crypto-tracker.uk.    300    IN    CNAME    cname.vercel-dns.com.
```

**Contract**:
- Status: `NOERROR`
- Answer count: ≥ 1
- Record type: `CNAME`
- Value: `cname.vercel-dns.com.`

---

### SPF Record Validation
**Endpoint**: DNS Query
**Method**: `dig TXT crypto-tracker.uk`

**Expected Response**:
```
;; ANSWER SECTION:
crypto-tracker.uk.    300    IN    TXT    "v=spf1 include:_spf.supabase.co ~all"
```

**Contract**:
- Contains SPF version: `v=spf1`
- Includes Supabase: `include:_spf.supabase.co`
- Policy: `~all` (soft fail) or `-all` (hard fail)

---

### DKIM Record Validation
**Endpoint**: DNS Query
**Method**: `dig TXT supabase._domainkey.crypto-tracker.uk`

**Expected Response**:
```
;; ANSWER SECTION:
supabase._domainkey.crypto-tracker.uk.    300    IN    TXT    "v=DKIM1; k=rsa; p=<public-key>"
```

**Contract**:
- DKIM version: `v=DKIM1`
- Key type: `k=rsa`
- Public key present: `p=<base64-encoded-key>`

---

### DMARC Record Validation
**Endpoint**: DNS Query
**Method**: `dig TXT _dmarc.crypto-tracker.uk`

**Expected Response**:
```
;; ANSWER SECTION:
_dmarc.crypto-tracker.uk.    300    IN    TXT    "v=DMARC1; p=none; rua=mailto:dmarc@crypto-tracker.uk"
```

**Contract**:
- DMARC version: `v=DMARC1`
- Policy: `p=none` (monitoring mode)
- Aggregate reports: `rua=mailto:<email>`

---

## SSL Certificate Contract

### Certificate Validation
**Endpoint**: `https://crypto-tracker.uk`
**Method**: TLS Handshake

**Expected Response**:
```
Subject: CN=crypto-tracker.uk
Issuer: Let's Encrypt
Valid from: <issue-date>
Valid to: <expiry-date> (>30 days from now)
```

**Contract**:
- Certificate chain valid
- Issuer: Let's Encrypt or other trusted CA
- Subject matches domain
- Expiry: > 30 days remaining
- No certificate warnings in browser

---

## Redirect Validation Contract

### Old Domain Redirect
**Endpoint**: `http://crypto-tracker-seven-lake.vercel.app/`
**Method**: GET

**Expected Response**:
```
HTTP/1.1 301 Moved Permanently
Location: https://crypto-tracker.uk/
```

**Contract**:
- Status code: `301` (permanent redirect)
- Location header: `https://crypto-tracker.uk/`
- Preserves path: `/test` → `https://crypto-tracker.uk/test`
- Preserves query params: `?id=123` → `https://crypto-tracker.uk/?id=123`

---

### WWW Redirect
**Endpoint**: `https://www.crypto-tracker.uk/`
**Method**: GET

**Expected Response**:
```
HTTP/1.1 301 Moved Permanently
Location: https://crypto-tracker.uk/
```

**Contract**:
- Status code: `301` (permanent redirect)
- Location header: `https://crypto-tracker.uk/`
- Preserves path and query params

---

### HTTP to HTTPS Redirect
**Endpoint**: `http://crypto-tracker.uk/`
**Method**: GET

**Expected Response**:
```
HTTP/1.1 301 Moved Permanently
Location: https://crypto-tracker.uk/
```

**Contract**:
- Status code: `301` (permanent redirect)
- Location header uses `https://`

---

## Environment Variable Contract

### Base URL Configuration
**Variable**: `NEXT_PUBLIC_SITE_URL`

**Production Value**: `https://crypto-tracker.uk`
**Staging Value**: `https://staging-crypto-tracker.vercel.app` or `https://staging.crypto-tracker.uk`
**Development Value**: `http://localhost:3000`

**Contract**:
- Must be absolute URL
- Must include protocol (`https://` for production/staging)
- Must NOT have trailing slash
- Must match current environment's domain

---

## Email Delivery Contract

### Authentication Email Send
**Action**: Password reset request
**Sender**: `noreply@crypto-tracker.uk`

**Expected Email Headers**:
```
From: noreply@crypto-tracker.uk
To: <user-email>
Subject: Reset your password
Authentication-Results: 
  spf=pass smtp.mailfrom=crypto-tracker.uk;
  dkim=pass header.d=crypto-tracker.uk;
  dmarc=pass
```

**Contract**:
- From address: `noreply@crypto-tracker.uk`
- SPF result: `pass`
- DKIM result: `pass`
- DMARC result: `pass` or `none` (monitoring mode)
- Links in email point to `https://crypto-tracker.uk`

---

## OAuth Callback Contract

### Google OAuth Callback
**Redirect URI**: `https://crypto-tracker.uk/auth/callback`

**Expected Behavior**:
- OAuth flow completes successfully
- User redirected to callback URL
- Callback URL matches registered URI in Google Console
- No CORS or redirect mismatch errors

**Contract**:
- Callback URL uses custom domain (not Vercel subdomain)
- HTTPS only
- Path matches registered callback

---

## Contract Test Implementation

### Test File Structure
```
__tests__/
  contract/
    dns-validation.test.ts        # DNS record validation
    ssl-certificate.test.ts       # SSL cert validation
    redirects.test.ts             # HTTP redirect validation
    email-delivery.test.ts        # Email authentication validation
    oauth-callback.test.ts        # OAuth flow validation
```

### Example Test (DNS Validation)
```typescript
describe('DNS Configuration Contract', () => {
  it('should resolve A record for crypto-tracker.uk', async () => {
    const result = await dns.resolve4('crypto-tracker.uk');
    expect(result).toContain('76.76.21.21'); // Or Vercel-assigned IP
  });

  it('should resolve CNAME for www subdomain', async () => {
    const result = await dns.resolveCname('www.crypto-tracker.uk');
    expect(result).toContain('cname.vercel-dns.com');
  });

  it('should have SPF record configured', async () => {
    const records = await dns.resolveTxt('crypto-tracker.uk');
    const spfRecord = records.flat().find(r => r.startsWith('v=spf1'));
    expect(spfRecord).toBeDefined();
    expect(spfRecord).toContain('include:_spf.supabase.co');
  });
});
```

---

## Monitoring & Alerting Contracts

### DNS Health Check
**Frequency**: Every 5 minutes
**Alert Condition**: DNS resolution fails for > 2 consecutive checks

### SSL Certificate Expiry
**Frequency**: Daily
**Alert Condition**: Certificate expires in < 30 days

### Email Deliverability
**Frequency**: Hourly
**Alert Condition**: Deliverability rate < 95% over 24-hour window

### Redirect Validation
**Frequency**: Every 15 minutes
**Alert Condition**: Any redirect returns non-301 status or incorrect location
