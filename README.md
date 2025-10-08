## Project Overview

This is a **cryptocurrency portfolio tracking application** built with modern web technologies. It's a full-stack web application that allows users to manage and monitor their cryptocurrency investments in real-time.

### Technology Stack

The project uses the following technologies:

- **Frontend Framework**: Next.js 15.5 (React 19) with TypeScript
- **Styling**: ShadCN UI / Tailwind 4 CSS for responsive design
- **Backend/Database**: Supabase (PostgreSQL database with built-in authentication)
- **Authentication**: Supabase Auth for user management
- **Deployment Ready**: Built for Vercel deployment

### Development / Architecture Principles
- Showcase high quality code with SOLID principles, strict type safety
- Use latest React hooks and Server Side rendering with NextJS, 
- Test driven development with red-green-refactor recycle, comprehensive test coverage with UI Automation tests 
- Consistent user experience, response time requiremetns, error handling and high performance UI with real-time updates

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database and authentication)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd crypto-tracker
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # Server runs at http://localhost:3000
   ```

### Running Tests

**One-time setup:**
```bash
# Initialize persistent test user pool
npx tsx scripts/init-test-pool.ts
```

**Contract/Integration tests** require the dev server to be running:

1. **Terminal 1** - Start dev server:
   ```bash
   npm run dev
   # Loads .env.local with TEST_MODE=true
   ```

2. **Terminal 2** - Run tests:
   ```bash
   npm test                                    # Run all tests
   npm test -- __tests__/contract/auth.*.test.ts  # Run auth tests
   npm test -- --ui                            # Run with UI
   ```

3. **After development** - Clean up test users:
   ```bash
   npm run test:cleanup  # Removes any leaked @testuser.com users
   ```

**Manual user deletion** (if needed):
```bash
npx tsx scripts/delete-user.ts <user-id>
# Deletes both auth user and user_profiles record
```

**Why separate terminals?**
- Contract tests make real HTTP requests to `localhost:3000`
- The server must be running with `TEST_MODE=true` (from `.env.local`)
- This enables admin client for test user creation (bypasses email confirmation)

**⚠️ IMPORTANT**: 
- `TEST_MODE=true` should **NEVER** be set in production!
- Always run `npm run test:cleanup` after manual testing to avoid rate limits

See [docs/TESTING.md](docs/TESTING.md) and [docs/TEST-MAINTENANCE.md](docs/TEST-MAINTENANCE.md) for detailed documentation.

## 🚀 Production Deployment

### Quick Deploy to Vercel (10 minutes)

**Prerequisites:**
- GitHub account
- Vercel account (free tier works)
- Production Supabase project
- Moralis API key

**Steps:**

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Add environment variables (see below)
   - Deploy!

3. **Configure Supabase**:
   - Update Site URL with your Vercel URL
   - Enable email confirmation
   - Configure SMTP for production emails

**Full deployment guide**: See [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) for step-by-step instructions.

**Detailed documentation**: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for comprehensive guide including email setup, custom domains, and troubleshooting.

### Environment Variables for Production

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
MORALIS_API_KEY=<your-moralis-key>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=<your-vercel-url>
```

**⚠️ IMPORTANT**: Never set `TEST_MODE=true` in production!

### Requirements
To be detailed later ...
