
# Implementation Plan: Custom Domain and Email Configuration

**Branch**: `002-configure-custom-domain` | **Date**: 2025-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-configure-custom-domain/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Configure crypto-tracker.uk as the custom domain for the application, replacing the default Vercel subdomain (crypto-tracker-seven-lake.vercel.app). This includes DNS configuration with SSL/TLS certificates, automatic redirects (old domain → new domain, www → non-www), updating all authentication callback URLs, and configuring Supabase's built-in email service to send from noreply@crypto-tracker.uk with proper SPF, DKIM, and DMARC authentication. The migration must preserve user sessions and be testable in staging before production deployment.

## Technical Context
**Language/Version**: TypeScript 5.x, Next.js 15.5, React 19  
**Primary Dependencies**: Vercel (hosting & DNS), Supabase (Auth & Email), Next.js configuration
**Storage**: Supabase PostgreSQL (for user sessions and configuration metadata)  
**Testing**: Vitest (unit), Playwright (E2E for redirect validation), manual DNS verification  
**Target Platform**: Vercel Edge Network, web browsers (all modern)
**Project Type**: Web application (frontend + backend API routes)  
**Performance Goals**: <1 minute downtime during migration, <200ms redirect latency  
**Constraints**: DNS propagation ≤24 hours, email deliverability ≥95%, SSL auto-renewal required  
**Scale/Scope**: Single production domain, ~10 environment variables, 5 DNS records, 3 email authentication records

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality & Architecture Integrity**
- [x] Complexity budget defined (functions ≤10) - Configuration functions are simple setters/validators
- [x] Layer boundaries identified (UI → services → data) - Config at infrastructure layer, minimal UI changes
- [x] Planned public API surface minimal & documented - Environment variables only, no new public APIs
- [x] Technical debt items (if any) captured - None, this is infrastructure configuration

**Test-First Quality Assurance**
- [x] Test types enumerated (unit, integration, UI automation, contract)
  - Unit: Environment variable validation, redirect logic
  - Integration: DNS resolution, SSL certificate validation
  - E2E: Full user flow with new domain (Playwright)
  - Contract: Email delivery verification with DMARC reports
- [x] Critical calculation paths listed for 100% coverage - N/A (no financial calculations)
- [x] Failing test scaffolds planned before coding - DNS check, redirect validation, email auth tests
- [x] Coverage target (≥80% overall) feasible - Yes, configuration code is highly testable

**User Experience Consistency**
- [x] Design system components reused (ShadCN/Tailwind tokens) - No UI changes required
- [x] Loading & error state patterns specified - Redirect happens at network level (transparent)
- [x] Accessibility acceptance criteria drafted - N/A (infrastructure change, no UI impact)
- [x] Performance UX targets (≤2s initial, ≤200ms interactions) recorded - <200ms redirect, <1min downtime

**Performance & Real-Time Responsiveness**
- [x] p95 latency targets per endpoint defined (≤200ms) - Redirect latency <200ms
- [x] Real-time update latency assumption (≤250ms) validated - N/A (no real-time features affected)
- [x] Indexing / caching considerations noted - DNS caching (TTL), CDN cache invalidation on deploy
- [x] Potential performance risks flagged early - DNS propagation delays, SSL cert provisioning time

## Project Structure

### Documentation (this feature)
```
specs/002-configure-custom-domain/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) ✓
├── data-model.md        # Phase 1 output (/plan command) ✓
├── quickstart.md        # Phase 1 output (/plan command) ✓
├── contracts/           # Phase 1 output (/plan command) ✓
│   └── config-validation.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure (Next.js)
app/
├── api/                 # No new API routes needed
├── auth/               # Existing auth routes (no changes)
└── ...                 # Other existing pages

lib/
├── constants.ts        # Will update with new domain constant
└── ...                 # Other utilities

__tests__/
├── contract/
│   ├── dns-validation.test.ts        # NEW - DNS record validation
│   ├── ssl-certificate.test.ts       # NEW - SSL cert validation
│   ├── redirects.test.ts             # NEW - HTTP redirect validation
│   ├── email-delivery.test.ts        # NEW - Email authentication validation
│   └── oauth-callback.test.ts        # NEW - OAuth flow validation
├── integration/
│   └── domain-migration.test.ts      # NEW - End-to-end migration test
└── e2e/
    └── custom-domain.spec.ts          # NEW - Playwright E2E test

# Configuration files (repository root)
vercel.json              # Will add redirect rules
next.config.ts           # May need updates for base URL
.env.example             # Will update with NEXT_PUBLIC_SITE_URL
```

**Structure Decision**: Web application structure. This feature primarily involves configuration changes rather than new code. Most work is in infrastructure (DNS, Vercel, Supabase) with minimal code changes limited to environment variable usage and redirect configuration.

## Phase 0: Outline & Research
✅ **COMPLETE** - See `research.md`

Key Research Findings:
- Vercel custom domain configuration via dashboard + DNS records
- SSL/TLS auto-provisioned by Let's Encrypt with auto-renewal
- Redirect configuration via `vercel.json` (edge-level performance)
- Supabase built-in SMTP for custom domain email
- Email authentication: SPF, DKIM, DMARC (monitoring mode)
- DNS propagation: 24-hour maximum window
- Comprehensive testing strategy defined
- Migration risks identified with mitigation plans
- Rollback procedures documented

No NEEDS CLARIFICATION remain - all unknowns resolved.

**Output**: ✓ research.md created

## Phase 1: Design & Contracts
✅ **COMPLETE** - See `data-model.md`, `contracts/`, and `quickstart.md`

Artifacts Created:
1. **data-model.md**: Configuration entities (Domain, Email, Environment, Redirects) - no DB schema changes
2. **contracts/config-validation.md**: Comprehensive validation contracts for:
   - DNS records (A, CNAME, SPF, DKIM, DMARC)
   - SSL certificate validation
   - HTTP redirect validation (old→new, www→non-www, HTTP→HTTPS)
   - Email delivery and authentication
   - OAuth callback validation
   - Environment variable contracts
3. **quickstart.md**: Step-by-step deployment guide with validation commands
4. **Agent context updated**: `.github/copilot-instructions.md` updated with new technologies

Contract Test Strategy:
- DNS validation using Node.js `dns` module
- SSL validation using TLS handshake verification
- Redirect validation using HTTP client (status codes, headers)
- Email delivery testing with header inspection
- OAuth flow E2E testing with Playwright

All tests will be failing (no implementation yet) - TDD approach.

**Output**: ✓ All Phase 1 artifacts created and agent context updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
This feature is configuration-heavy with minimal code changes. Tasks will follow this structure:

1. **Infrastructure Setup Tasks** (sequential, must complete first):
   - DNS record creation (A, CNAME, SPF, DKIM, DMARC)
   - Vercel domain configuration
   - SSL certificate verification
   - Supabase SMTP configuration

2. **Configuration Tasks** (can run in parallel after infrastructure):
   - Update `vercel.json` with redirect rules [P]
   - Update environment variables (Vercel dashboard) [P]
   - Update OAuth provider callbacks [P]
   - Update email templates in Supabase [P]

3. **Contract Test Tasks** (can run in parallel, must precede implementation):
   - DNS validation test [P]
   - SSL certificate validation test [P]
   - Redirect validation test [P]
   - Email delivery test [P]
   - OAuth callback test [P]

4. **Integration Tasks** (sequential, after tests):
   - Update constants/environment variable usage in code
   - Deploy to staging environment
   - Run full validation suite
   - Document rollback procedures

5. **Validation Tasks** (final phase):
   - Execute quickstart guide in staging
   - Monitor DNS propagation (24 hours)
   - Validate email deliverability
   - Production deployment

**Ordering Strategy**:
- Infrastructure setup is prerequisite for everything else
- Contract tests before configuration deployment (TDD)
- Staging validation before production
- Heavy use of [P] parallel markers for independent infrastructure tasks

**Estimated Output**: 20-25 numbered tasks in tasks.md

**Special Considerations**:
- Many tasks are manual infrastructure configuration (DNS, Vercel dashboard, Supabase dashboard)
- Automated tests validate configuration rather than implement features
- 24-hour DNS propagation creates natural checkpoint between phases
- Rollback plan must be ready before production deployment

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations detected. This feature:
- Involves simple configuration functions (complexity ≤10)
- Has clear infrastructure/application layer boundaries
- Follows TDD with comprehensive contract tests
- Maintains performance targets (<1min downtime, <200ms redirects)
- Requires no new public APIs or complex architectural changes

**No complexity deviations to track.**


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
