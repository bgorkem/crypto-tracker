# crypto-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-04

## Active Technologies
- TypeScript 5.x (Next.js 15.5 with React 19) + Next.js 15.5, React 19, Supabase (PostgreSQL + Auth), Tailwind 4, ShadCN UI, Moralis API (crypto prices), Recharts/TradingView (charting) (001-MVP-features)

## Project Structure
```
src/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
TypeScript 5.x (Next.js 15.5 with React 19): Follow standard conventions

## Recent Changes
- 001-MVP-features: Added TypeScript 5.x (Next.js 15.5 with React 19) + Next.js 15.5, React 19, Supabase (PostgreSQL + Auth), Tailwind 4, ShadCN UI, Moralis API (crypto prices), Recharts/TradingView (charting)

<!-- MANUAL ADDITIONS START -->
## Development Workflow

**GitHub Spec Kit Integration**
- This workspace follows the [GitHub Spec Kit](https://github.com/github/spec-kit/) development workflow
- **REQUIRED**: At the start of each new session, read the Spec Kit workflow documentation and follow procedures accordingly
- All feature development should align with Spec Kit best practices:
  - Feature specifications in `specs/` directory
  - Test-driven development with clear test cases
  - Documentation updates alongside code changes
  - Proper branching strategy (feature branches from main)

## Development Server Rules

**CRITICAL: `npm run dev` Management**
- Always run `npm run dev` in a separate terminal to avoid interfering with other commands
- Before starting `npm run dev`, check if port 3000 is already in use:
  - Run: `lsof -ti:3000` to check for existing processes
  - If a process exists, terminate it: `kill -9 $(lsof -ti:3000)`
  - Then start the new dev server
- Use background mode (`isBackground: true`) when running `npm run dev` via `run_in_terminal`
- Never block other terminal operations with a running dev server

**Example workflow:**
```bash
# Check for existing process
lsof -ti:3000

# If found, kill it
kill -9 $(lsof -ti:3000)

# Start new dev server in background
npm run dev
```
<!-- MANUAL ADDITIONS END -->