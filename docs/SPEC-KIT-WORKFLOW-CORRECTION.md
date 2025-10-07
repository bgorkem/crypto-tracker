# Spec Kit Workflow Correction - Session Summary

**Date**: 2025-10-07 (Afternoon)  
**Issue**: Incorrect approach to adding new requirements  
**Resolution**: Followed proper spec-kit workflow

---

## What Happened

### Initial Incorrect Approach ❌
1. Created standalone `specs/001-MVP-features/T097-branding-layout.md` (258 lines)
2. Created standalone `docs/T097-SPEC-REVIEW.md` (204 lines)
3. Updated `progress.md` to reference standalone spec

**Problem**: Spec-kit workflow requires requirements to be added to existing `spec.md` and tasks to `tasks.md`, NOT as standalone spec files per feature.

---

## Correction Applied ✅

### Step 1: Added Requirements to spec.md (Commit 462e12c)

**New Functional Requirements**:
- **FR-026**: System MUST display consistent header with application logo and navigation across all pages
- **FR-027**: System MUST display user account menu in header when authenticated, showing user email and logout action
- **FR-028**: System MUST display footer with application information and links across all pages
- **FR-029**: Header logo MUST navigate to dashboard when user is authenticated, or landing page when not authenticated
- **FR-030**: User account menu MUST be accessible via keyboard navigation and display user avatar with email first letter

**New Non-Functional Requirement**:
- **NFR-014**: Header and footer MUST maintain consistent layout across all pages without layout shift during authentication state changes

**New Acceptance Scenarios**:
10. **Given** a logged-in user on any page (dashboard, portfolio detail, auth), **When** they view the page, **Then** a consistent header with logo and user account menu is displayed, and footer with app info is shown.
11. **Given** a logged-in user, **When** they click their user avatar in the header, **Then** a dropdown shows their email and logout option.
12. **Given** a logged-in user, **When** they click logout in the account menu, **Then** they are logged out and redirected to the login page.

---

### Step 2: Added Tasks to tasks.md (Commit 462e12c)

**New Tasks (T093-T097)**:

**T093 [P] Create Footer component**
- Path: `components/layout/Footer.tsx`
- Requirements: App name, copyright, links (Privacy, Terms, Docs)
- Responsive layout
- Appears on all pages

**T094 [P] Create UserAccountMenu component**
- Path: `components/layout/UserAccountMenu.tsx`
- Uses shadcn DropdownMenu
- Avatar with email first letter
- Shows email and logout button
- Keyboard accessible

**T095 [P] Create Header component**
- Path: `components/layout/Header.tsx`
- Logo: ₿ + "CryptoTracker"
- Navigation based on auth state
- Integrates UserAccountMenu
- Responsive layout

**T096 Integrate Header and Footer into root layout**
- Path: `app/layout.tsx`
- Fetch auth state
- Pass user data to Header
- Implement onLogout handler
- No layout shift (NFR-014)

**T097 Update pages to remove duplicate navigation**
- Path: `app/dashboard/page.tsx`, `app/portfolio/[id]/components/PortfolioHeader.tsx`
- Remove standalone logout button
- Remove "Back" button (handled by Header)
- Keep portfolio-specific actions

**Dependencies**:
```
Layout Components (T093-T097)
  ├─ T093 (Footer) [P] → standalone component
  ├─ T094 (UserAccountMenu) [P] → requires shadcn DropdownMenu
  ├─ T095 (Header) → requires T094 (UserAccountMenu)
  ├─ T096 (Root Layout Integration) → requires T093, T095
  └─ T097 (Remove Duplicates) → requires T096
```

---

### Step 3: Cleaned Up Incorrect Files (Commits d67466a, 43b52fc)

**Removed**:
- `specs/001-MVP-features/T097-branding-layout.md`
- `docs/T097-SPEC-REVIEW.md`
- `components/layout/Header.tsx` (accidentally created during cancellation)

**Reason**: Requirements belong in `spec.md`, tasks belong in `tasks.md`. Standalone spec files are only for major feature branches (e.g., `001-MVP-features`), not for individual tasks within a feature.

---

### Step 4: Updated Progress Tracking (Commit f0d8859)

**progress.md Changes**:
- Total tasks: 93 → 97
- Overall progress: 85% → 81%
- Added "New Requirements - Branding & Layout" section
- Listed T093-T097 as ❌ Not Started
- Documented spec.md and tasks.md updates

---

## Spec Kit Workflow (Correct Approach)

### For Existing Feature (Adding Requirements)
1. ✅ **Update spec.md**: Add FRs/NFRs/Scenarios to existing spec
2. ✅ **Update tasks.md**: Add tasks (T###) following spec-kit format
3. ✅ **Update progress.md**: Track new tasks in progress
4. ✅ **Implement**: Follow tasks in order with dependencies

### For New Feature (Separate Branch)
1. `/speckit.specify` - Creates new feature branch + spec
2. `/speckit.plan` - Creates plan.md, research.md, data-model.md, etc.
3. `/speckit.tasks` - Creates tasks.md
4. `/speckit.implement` - Executes tasks

---

## Key Learnings

### ❌ Don't Do This:
- Create standalone spec files for tasks within an existing feature
- Create separate "review" documents instead of using spec.md
- Mix implementation details into specs
- Create components before tasks are defined

### ✅ Do This:
- Add requirements to existing `spec.md` (FR-### format)
- Add tasks to existing `tasks.md` (T### format with path, action, requirements, verify)
- Use spec-kit templates and format strictly
- Follow dependency order in tasks.md
- Update progress.md after spec/tasks changes

---

## Current Status

**Spec**: ✅ UPDATED
- 5 new FRs (FR-026 to FR-030)
- 1 new NFR (NFR-014)
- 3 new acceptance scenarios (10-12)

**Tasks**: ✅ UPDATED
- 5 new tasks (T093-T097)
- Dependencies documented
- Format follows spec-kit template

**Progress**: ✅ UPDATED
- 79/97 tasks (81%)
- All tests passing (130/130)
- Ready for implementation

**Next Steps**:
1. Review and approve requirements (FR-026 to FR-030)
2. Implement T093-T097 following dependency order
3. Test implementation (manual + automated)
4. Update progress as tasks complete

---

## References

**Spec-Kit Repository**: https://github.com/github/spec-kit

**Key Concepts**:
- Specification-Driven Development (SDD)
- Intent-driven development (natural language specs → code)
- specs/###-feature/ structure for major features
- spec.md → plan.md → tasks.md workflow
- User stories organized by priority (P1, P2, P3)

**Commits**:
- 462e12c - Added requirements to spec.md and tasks to tasks.md
- d67466a - Removed standalone T097 spec files
- 43b52fc - Removed accidentally created Header.tsx
- f0d8859 - Updated progress.md with corrections

---

## Summary

Corrected workflow mistake by:
1. Moving requirements from standalone files into `spec.md`
2. Moving tasks into `tasks.md` following spec-kit format
3. Removing incorrect standalone documentation
4. Updating progress tracking properly

All branding/layout requirements now properly integrated into existing 001-MVP-features spec following spec-kit best practices. Ready for implementation! ✅
