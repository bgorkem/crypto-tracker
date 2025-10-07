# Testing Lessons Learned

## Issue: User Profile Creation Not Caught by Tests

### What Happened (2025-10-07)

**Production Issue**: Users could register but not create portfolios.

**Error**: `foreign key constraint "portfolios_user_id_fkey" violated`

**Root Cause**: Missing `user_profiles` records for registered users.

### Why Tests Didn't Catch This

Our tests used the `/api/auth/register` endpoint which manually creates `user_profiles`:

```typescript
// In app/api/auth/register/route.ts
await supabase
  .from('user_profiles')
  .insert({
    id: authData.user.id,
    email: authData.user.email!,
    // ...
  })
```

✅ **Tests passed** because they went through our API.

❌ **Production failed** because users registered via:
- Email confirmation links
- OAuth providers (bypassing our endpoint)
- Supabase native auth flow

### The Real Solution

Application code is **not enough**. We needed a **database trigger**:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This catches **ALL** registration methods, not just our API endpoint.

---

## Key Lessons

### 1. Database-Level Guarantees > Application Code

| Method | Pros | Cons |
|--------|------|------|
| **Application Code** | Easy to write, testable | Only covers paths you control |
| **Database Triggers** | Covers ALL paths, guaranteed | Harder to test, debug |

**Use triggers for critical invariants** like "every user MUST have a profile."

### 2. Test Multiple Registration Paths

Don't just test your API endpoints. Test:

```typescript
// ✅ Via your API
await fetch('/api/auth/register', { ... })

// ✅ Via Supabase directly
await supabase.auth.signUp({ ... })

// ✅ Via OAuth simulation
await supabase.auth.signInWithOAuth({ provider: 'google' })

// ✅ Admin-created users
await supabase.auth.admin.createUser({ ... })
```

### 3. Production Environment Differences

**Test Mode** (`TEST_MODE=true`):
- Uses admin client
- Bypasses email confirmation
- May have different code paths

**Production** (`TEST_MODE=false`):
- Uses regular client
- Requires email confirmation
- Different auth flows

**Always test with `TEST_MODE=false` before deployment!**

### 4. Integration Tests Should Mirror Production

Our tests should have included:

```typescript
describe('Production-like registration', () => {
  beforeAll(() => {
    // Force production mode for this suite
    process.env.TEST_MODE = 'false'
  })
  
  test('Register via Supabase native and create portfolio', async () => {
    // This would have caught the bug!
    const { data } = await supabase.auth.signUp({
      email: 'newuser@test.com',
      password: 'pass123'
    })
    
    const portfolio = await createPortfolio(data.session.access_token)
    expect(portfolio).toBeDefined() // Would FAIL without trigger
  })
})
```

---

## Action Items for Future Projects

### Initial Setup Checklist

- [ ] **User registration trigger**
  ```sql
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    EXECUTE FUNCTION handle_new_user();
  ```

- [ ] **Test all auth paths**
  - API endpoints
  - Native Supabase auth
  - OAuth providers
  - Magic links
  - Admin creation

- [ ] **Test with TEST_MODE=false**
  - At least one test suite in production mode
  - Verify all critical paths work

- [ ] **Database constraints**
  - Use triggers for invariants
  - Don't rely only on application code
  - Document why triggers exist

### Code Review Checklist

When reviewing auth changes:

- [ ] Does this create database records?
- [ ] Could users bypass this via other auth methods?
- [ ] Should this be a database trigger instead?
- [ ] Are all registration paths tested?

---

## Updated Test Strategy

### Before (What We Had)

```typescript
// Only tested our API endpoint
test('Register user', async () => {
  const response = await fetch('/api/auth/register', { ... })
  expect(response.status).toBe(201)
})
```

### After (What We Need)

```typescript
describe('User Registration', () => {
  describe('Via API endpoint', () => {
    test('creates user_profile', async () => { ... })
  })
  
  describe('Via Supabase native auth', () => {
    test('creates user_profile via trigger', async () => {
      // Register without our API
      const { data } = await supabase.auth.signUp({ ... })
      
      // Verify profile exists
      const profile = await getProfile(data.user.id)
      expect(profile).toBeDefined()
    })
  })
  
  describe('Critical path after registration', () => {
    test('can create portfolio immediately', async () => {
      // This tests the full flow
      const user = await registerViaSupabase()
      const portfolio = await createPortfolio(user.token)
      expect(portfolio).toBeDefined()
    })
  })
})
```

---

## Documentation Updates

Added to deployment checklist:
- ✅ Verify database triggers are applied
- ✅ Test registration via multiple methods
- ✅ Test critical post-registration actions

Added to testing guide:
- ✅ Test with TEST_MODE=false
- ✅ Test multiple auth paths
- ✅ Test database-level constraints

---

## Conclusion

**Why it happened**: We tested application code but not database-level guarantees.

**How to prevent**: 
1. Use database triggers for critical invariants
2. Test all registration paths, not just your API
3. Always have production-mode tests
4. Never assume users only use your endpoints

**Cost**: 2-hour production outage, one confused user, valuable lesson learned.

**Benefit**: Now we have robust, guaranteed user profile creation for all auth methods! 🎉
