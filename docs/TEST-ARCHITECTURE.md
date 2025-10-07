# Test Architecture Overview

## Contract/Integration Test Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TERMINAL 1: Dev Server                    │
│                                                               │
│  $ npm run dev                                                │
│                                                               │
│  ┌─────────────────────────────────────────┐                │
│  │  Next.js Server (localhost:3000)        │                │
│  │  ┌────────────────────────────────────┐ │                │
│  │  │ Loads .env.local at startup        │ │                │
│  │  │ TEST_MODE=true                     │ │                │
│  │  │ SUPABASE_URL=...                   │ │                │
│  │  │ SUPABASE_SERVICE_ROLE_KEY=...      │ │                │
│  │  └────────────────────────────────────┘ │                │
│  │                                          │                │
│  │  API Routes:                             │                │
│  │  POST /api/auth/register                 │                │
│  │  POST /api/auth/login                    │                │
│  │  POST /api/auth/logout                   │                │
│  │  etc...                                  │                │
│  │                                          │                │
│  │  if (TEST_MODE === 'true'):              │                │
│  │    → Use adminClient (bypass email)      │                │
│  │  else:                                   │                │
│  │    → Use normal signup (require email)   │                │
│  └─────────────────────────────────────────┘                │
│                          ▲                                    │
│                          │ HTTP Requests                     │
│                          │                                    │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    TERMINAL 2: Test Runner                    │
│                          │                                    │
│  $ npm test -- __tests__/contract/auth.register.test.ts      │
│                          │                                    │
│  ┌──────────────────────▼────────────────┐                   │
│  │  Vitest Test Runner                   │                   │
│  │                                        │                   │
│  │  describe('POST /api/auth/register')  │                   │
│  │    it('returns 201 with user', ...)   │                   │
│  │                                        │                   │
│  │    fetch('http://localhost:3000/...') │──────────┐        │
│  │    fetch('http://localhost:3000/...') │──────────┤        │
│  │    fetch('http://localhost:3000/...') │──────────┤        │
│  │    fetch('http://localhost:3000/...') │──────────┘        │
│  │                                        │                   │
│  │  ✓ 4 tests passing                    │                   │
│  └────────────────────────────────────────┘                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Environment Variable Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Development (.env.local)                  │
│  TEST_MODE=true   ← Used by dev server for contract tests    │
│  NODE_ENV=development                                         │
│  SUPABASE_SERVICE_ROLE_KEY=xxx   ← Admin key available       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    npm run dev (loads .env.local)
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Server Running with TEST_MODE=true               │
│                                                               │
│  Registration Flow:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ if (process.env.TEST_MODE === 'true') {                 │ │
│  │   const adminClient = createAdminClient()               │ │
│  │   await adminClient.auth.admin.createUser({             │ │
│  │     email, password,                                    │ │
│  │     email_confirm: true  ← Auto-confirmed!              │ │
│  │   })                                                     │ │
│  │ } else {                                                 │ │
│  │   await anonClient.auth.signUp({                        │ │
│  │     email, password  ← Requires email confirmation      │ │
│  │   })                                                     │ │
│  │ }                                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                Production (Environment Variables)             │
│  TEST_MODE=false   (or omitted - defaults to false)          │
│  NODE_ENV=production                                          │
│  SUPABASE_SERVICE_ROLE_KEY=xxx   ← Not used for registration │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Production deployment (Vercel/etc)
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Server Running with TEST_MODE=false              │
│                                                               │
│  Registration Flow:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Always uses: anonClient.auth.signUp()                   │ │
│  │ Email confirmation REQUIRED ✓                            │ │
│  │ Secure production behavior ✓                             │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Key Points

1. **`.env.local` is for local development only**
   - Not committed to git (in `.gitignore`)
   - Contains `TEST_MODE=true` for running contract tests
   - Loaded automatically by Next.js dev server

2. **Contract tests are integration tests**
   - Make real HTTP requests to `localhost:3000`
   - Require dev server to be running
   - Test the full API stack (routing → validation → database → response)

3. **TEST_MODE only affects the running server**
   - Tests don't set environment variables
   - Tests just make HTTP requests
   - The server's environment determines behavior

4. **Production is secure by default**
   - `.env.local` never deployed
   - Production env vars have `TEST_MODE=false` or omitted
   - Email confirmation always required in production
