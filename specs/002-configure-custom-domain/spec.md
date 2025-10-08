# Feature Specification: Custom Domain and Email Configuration

**Feature Branch**: `002-configure-custom-domain`  
**Created**: 2025-01-08  
**Status**: Draft  
**Input**: User description: "Configure custom domain crypto-tracker.uk with Vercel and email setup"

## Execution Flow (main)
```
1. Parse user description from Input
   → SUCCESS: Feature description provided
2. Extract key concepts from description
   → Identify: custom domain, Vercel configuration, email setup
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → User flow: domain configuration and email verification
5. Generate Functional Requirements
   → Each requirement must be testable
6. Identify Key Entities (if data involved)
   → Configuration entities identified
7. Run Review Checklist
   → Check for ambiguities and implementation details
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## Clarifications

### Session 2025-01-08
- Q: What email address format should be used as the sender for authentication emails? → A: `noreply@crypto-tracker.uk`
- Q: Should www.crypto-tracker.uk redirect to crypto-tracker.uk, or the other way around? → A: www → non-www (www.crypto-tracker.uk redirects to crypto-tracker.uk)
- Q: What DMARC policy level should be used for email authentication? → A: `none` (monitor only, collect reports but don't enforce)
- Q: What is the acceptable DNS propagation timeframe before the feature is considered complete? → A: 24 hours (standard industry expectation)
- Q: Which email service provider should be used for sending emails from the custom domain? → A: Supabase built-in (use Supabase's native email capabilities)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a product owner, I want to configure the crypto-tracker application to use the custom domain `crypto-tracker.uk` instead of the default Vercel subdomain, so that:
- Users access the application through a professional, branded domain
- All authentication redirect URLs use the custom domain
- Email communications are sent from the custom domain with proper authentication
- The application maintains a consistent brand identity across all touchpoints

### Acceptance Scenarios
1. **Given** the application is deployed on Vercel, **When** a user navigates to `https://crypto-tracker.uk`, **Then** the application loads successfully with valid SSL certificate
2. **Given** the custom domain is configured, **When** a user attempts to log in, **Then** authentication redirects use `https://crypto-tracker.uk/auth/login` instead of the old Vercel URL
3. **Given** email configuration is complete, **When** the system sends authentication emails, **Then** emails are sent from `@crypto-tracker.uk` domain with proper SPF/DKIM verification
4. **Given** a user requests password reset, **When** the email is sent, **Then** all links in the email point to `https://crypto-tracker.uk`
5. **Given** the custom domain is live, **When** a user accesses the old Vercel URL, **Then** they are automatically redirected to the custom domain

### Edge Cases
- What happens when DNS propagation is incomplete?
- How does the system handle SSL certificate renewal?
- What happens if email authentication (SPF/DKIM) fails?
- How are existing user sessions handled during the domain migration?
- What happens to OAuth callbacks configured with the old domain?

## Requirements *(mandatory)*

### Functional Requirements

#### Domain Configuration
- **FR-001**: System MUST be accessible via the custom domain `crypto-tracker.uk` with valid SSL/TLS certificate
- **FR-002**: System MUST automatically redirect all traffic from the old Vercel subdomain (`crypto-tracker-seven-lake.vercel.app`) to `crypto-tracker.uk`
- **FR-003**: System MUST maintain HTTPS-only access with automatic HTTP to HTTPS redirection
- **FR-004**: All internal links and redirects MUST use the custom domain as the base URL
- **FR-005**: System MUST redirect www.crypto-tracker.uk to crypto-tracker.uk (non-www is canonical)

#### Authentication & URLs
- **FR-006**: All authentication redirect URLs MUST use `https://crypto-tracker.uk` as the base domain
- **FR-007**: OAuth provider configurations MUST be updated to use the custom domain callback URLs
- **FR-008**: Password reset links MUST point to `https://crypto-tracker.uk/auth/reset-password`
- **FR-009**: Email verification links MUST point to `https://crypto-tracker.uk/auth/verify`
- **FR-010**: System MUST preserve user sessions during domain migration

#### Email Configuration
- **FR-011**: System MUST send emails from `noreply@crypto-tracker.uk` address
- **FR-012**: Email sender address MUST be properly authenticated with SPF records
- **FR-013**: Email sender address MUST be properly authenticated with DKIM signatures
- **FR-014**: Email sender address MUST be configured with DMARC policy set to `p=none` (monitoring mode with aggregate reports)
- **FR-015**: All email templates MUST reference the custom domain in links and branding
- **FR-016**: System MUST handle email delivery failures gracefully with appropriate logging

#### Verification & Testing
- **FR-017**: System MUST provide a way to verify DNS configuration is correct
- **FR-018**: System MUST provide a way to verify email authentication is working
- **FR-019**: System MUST log all domain-related configuration issues for debugging
- **FR-020**: Migration MUST be testable in a staging environment before production deployment

### Non-Functional Requirements
- **NFR-001**: SSL certificate renewal MUST happen automatically without service interruption
- **NFR-002**: DNS propagation MUST complete within 24 hours of configuration changes
- **NFR-003**: Email deliverability rate MUST be monitored and maintained above 95%
- **NFR-004**: Domain configuration changes MUST not cause downtime exceeding 1 minute

### Key Entities *(include if feature involves data)*
- **Domain Configuration**: Represents the custom domain settings including domain name, DNS records, SSL certificate status
- **Email Configuration**: Represents email sender settings using Supabase's built-in email service, including sender address `noreply@crypto-tracker.uk`, authentication records (SPF, DKIM, DMARC), and SMTP credentials
- **Redirect Rules**: Represents URL redirect mappings from old Vercel domain to custom domain, and www to non-www redirects
- **Environment Configuration**: Represents environment-specific settings for base URLs across development, staging, and production

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Constitutional Compliance
- [x] Performance targets quantified (NFR-004: <1min downtime)
- [x] Test strategy covers staging verification before production
- [x] Accessibility & UX consistency criteria defined (redirect handling)
- [x] Critical financial calculations identified & test-covered (N/A - no financial calculations in this feature)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (5 clarifications completed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes for Planning Phase

All critical clarifications have been resolved. The following dependencies should be considered during planning:
- Access to DNS management for crypto-tracker.uk domain
- Access to Vercel project configuration
- Access to Supabase authentication settings for OAuth callback updates and custom SMTP configuration
- Staging environment availability for testing

This is a configuration-heavy feature that affects multiple infrastructure layers (DNS, hosting, authentication, email) and should be implemented with careful rollback planning.
