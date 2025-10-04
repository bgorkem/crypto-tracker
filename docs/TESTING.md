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

Tests automatically use `TEST_MODE=true` (configured in `.env.local`):

```bash
# All contract tests use real Supabase instance
npm test -- __tests__/contract/auth.register.test.ts
```

Tests use unique email addresses (timestamp-based) to avoid conflicts:
```typescript
const uniqueEmail = `newuser-${Date.now()}@example.com`;
```
