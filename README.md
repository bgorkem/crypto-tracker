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

**Why separate terminals?**
- Contract tests make real HTTP requests to `localhost:3000`
- The server must be running with `TEST_MODE=true` (from `.env.local`)
- This enables admin client for test user creation (bypasses email confirmation)

**⚠️ IMPORTANT**: `TEST_MODE=true` should **NEVER** be set in production!

See [docs/TESTING.md](docs/TESTING.md) for detailed testing documentation.

### Requirements
To be detailed later ...
