# Test Maintenance Guide

## Test User Pool

This project uses a **persistent test user pool** to avoid Supabase rate limiting.

### Test Users
- **Pool Users:** `tester01@testpool.com` through `tester10@testpool.com`
- **Password:** `TestPool123!`
- **Status:** Permanent - never deleted

### Important Commands

```bash
# Initialize test pool (run once on new setup)
npx tsx scripts/init-test-pool.ts

# Clean up any leaked @testuser.com users
npm run test:cleanup

# Run tests (requires dev server running)
npm run dev          # Terminal 1 - keep running
npm test             # Terminal 2
```

### Daily Workflow

**DO:**
✅ Use test pool users for all tests
✅ Clean up test data between test runs
✅ Run `npm run test:cleanup` after debugging sessions
✅ Keep dev server running in separate terminal

**DON'T:**
❌ Delete `@testpool.com` users
❌ Create new `@testuser.com` users
❌ Run tests without dev server
❌ Forget to clean up after manual testing

### Troubleshooting

**Rate Limit Errors (429)?**
- Run `npm run test:cleanup` to remove leaked users
- Wait 1-2 minutes before running tests again
- Check vitest.config.ts has `maxConcurrency: 3`

**Tests Failing Intermittently?**
- Ensure dev server is running on port 3000
- Check `TEST_MODE=true` in `.env.local`
- Run `npx tsx scripts/init-test-pool.ts` to verify pool exists

**"User already exists" errors?**
- Good! This means the test pool is working
- Tests use `authenticateTestUser()` which handles this

### Cleanup Schedule

**After each development session:**
```bash
npm run test:cleanup
```

**Before committing:**
```bash
# Verify no temporary test files
git status
# Should NOT see: test-diagnostic-run.log or similar
```

### Test Pool Architecture

```
Test Pool (Permanent)
├── tester01@testpool.com ← Reused forever
├── tester02@testpool.com
├── ...
└── tester10@testpool.com

Cleanup targets ONLY:
└── *@testuser.com ← Temporary users (mistakes)
```

For detailed information, see `docs/TEST-STABILIZATION-2025-10-06.md`
