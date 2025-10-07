# Testing Guide

## Test Mode Configuration

### TEST_MODE Environment Variable

The `TEST_MODE` environment variable controls whether the application bypasses email confirmation during user registration.

**Location**: `.env.local` or environment configuration

**Values**:
- `false` (default): Production behavior - requires email confirmation
- `true`: Test behavior - bypasses email confirmation using admin client

### Security Considerations

⚠️ **CRITICAL SECURITY WARNING** ⚠️

**NEVER set `TEST_MODE=true` in production environments!**

When `TEST_MODE=true`:
- Registration uses Supabase admin client (service role key)
- Email confirmation is automatically bypassed
- Users are immediately confirmed without verification
- **This is a security risk in production!**

When `TEST_MODE=false` (production):
- Registration uses normal Supabase signup flow
- Email confirmation is required
- Users must verify their email before accessing the app
- **This is the secure, production-ready behavior**

### Usage

**For Development/Testing**:
```bash
# In .env.local
TEST_MODE=true
```

**For Production**:
```bash
# In production environment
TEST_MODE=false
# Or simply omit the variable (defaults to false)
```

### Implementation

The registration endpoint (`app/api/auth/register/route.ts`) checks `TEST_MODE`:

```typescript
const isTestMode = process.env.TEST_MODE === 'true'

if (isTestMode) {
  // Use admin client - bypasses email confirmation
  const adminClient = createAdminClient()
  await adminClient.auth.admin.createUser({ ... })
} else {
  // Use normal signup - requires email confirmation
  await anonClient.auth.signUp({ ... })
}
```

A runtime warning is logged if `TEST_MODE=true` in production:
```
⚠️  WARNING: TEST_MODE is enabled in production! This is a security risk.
```

### Running Tests

**Contract/Integration tests require a running server with `TEST_MODE=true`:**

1. **Start the dev server** (loads `.env.local`):
   ```bash
   npm run dev
   # Server starts with TEST_MODE=true from .env.local
   ```

2. **Run tests** (in a separate terminal):
   ```bash
   # Tests make HTTP requests to localhost:3000
   npm test -- __tests__/contract/auth.register.test.ts
   ```

**Why this approach?**
- Contract tests verify the **full HTTP API** (not just code)
- Server must be running separately from test runner
- `.env.local` configures the dev server with `TEST_MODE=true`
- Production deployment ignores `.env.local` and uses `TEST_MODE=false`

**Environment file hierarchy:**
```
.env.local          → Local development (TEST_MODE=true)
.env.example        → Template (TEST_MODE=false)
Production env vars → Deployed app (TEST_MODE=false or omitted)
```

Tests use unique email addresses (timestamp-based) to avoid conflicts:
```typescript
const uniqueEmail = `newuser-${Date.now()}@testuser.com`;
```

### Test Cleanup

After running contract tests, test users accumulate in the Supabase `auth.users` table. To clean them up:

```bash
npm run test:cleanup
```

**What it does:**
- Deletes all test users with `@testuser.com` domain
- Uses admin client with service role key
- Safe operation - only deletes users matching the test domain pattern

**When to run:**
- After running contract tests
- When Supabase auth console shows many test users
- Periodically during development

**Example output:**
```
🧹 Starting test user cleanup...
🧹 Cleaning up 25 test users...
✅ Cleanup complete
```

**Note:** Cleanup requires environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
