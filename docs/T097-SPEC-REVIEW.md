# T097: Branding & Layout Components - Spec Review

**Created**: 2025-10-07  
**Status**: 📋 Awaiting Approval  
**Estimated Effort**: 3-4 hours

## Quick Summary

You requested:
> - we need proper footer / header / logo (simple) on every page (login / register / dashboard / portfolio etc)
> - user account should have an avatar on the right once logged in - should have users email details and a logout button

I paused implementation to create proper specs first, following the spec kit workflow.

## What's Been Created

### 1. Full Specification Document
**File**: `specs/001-MVP-features/T097-branding-layout.md` (258 lines)

**Contents**:
- ✅ Problem statement (what's missing now)
- ✅ Functional requirements (header, footer, user menu)
- ✅ Non-functional requirements (performance, accessibility)
- ✅ Technical design (components to create/modify)
- ✅ Implementation plan (4 phases, ~4 hours)
- ✅ Acceptance criteria (visual + functional + integration)
- ✅ Testing strategy (unit, integration, E2E, manual)
- ✅ Risk mitigation
- ✅ Follow-up tasks (profile page, dark mode, etc.)

### 2. Updated Progress Tracker
**File**: `specs/001-MVP-features/progress.md`

**Changes**:
- Total tasks: 92 → 93
- Overall progress: 86% → 85% (denominator increased)
- Added T097 to "Remaining Work" section
- Marked as "📋 SPEC CREATED"

## Proposed Implementation

### Components to Create (3 new files)

1. **`components/layout/Header.tsx`**
   - Logo (₿ + "CryptoTracker")
   - Navigation links (Dashboard)
   - User account menu (when authenticated)
   - Sign In/Get Started buttons (when not authenticated)

2. **`components/layout/UserAccountMenu.tsx`**
   - Avatar with first letter of email
   - Dropdown menu (shadcn DropdownMenu)
   - Shows email address
   - Logout button

3. **`components/layout/Footer.tsx`**
   - App name and copyright
   - Links: Privacy, Terms, Docs (placeholders)
   - Responsive layout

### Files to Modify (4 pages)

1. **`app/layout.tsx`** - Add Header + Footer to root layout
2. **`app/dashboard/page.tsx`** - Remove duplicate logout button
3. **`app/portfolio/[id]/page.tsx`** - Adjust header (keep portfolio actions)
4. **Auth pages** - Already minimal, just need Header/Footer

### Implementation Phases

**Phase 1: Create Components** (1.5h)
- Build Footer, UserAccountMenu, Header
- Test in isolation

**Phase 2: Root Layout Integration** (1h)
- Add to app/layout.tsx
- Fetch auth state
- Test on all pages

**Phase 3: Page-Specific Updates** (1h)
- Remove duplicates
- Adjust portfolio page
- Verify flow

**Phase 4: Polish & Testing** (0.5h)
- Responsive check
- Accessibility audit
- Update tests

## Key Design Decisions

### 1. Logo Design
- Symbol: ₿ (Bitcoin symbol) in circle
- Text: "CryptoTracker"
- Simple, recognizable, crypto-themed

### 2. User Menu
- Uses shadcn/ui DropdownMenu (consistent with existing UI)
- Avatar shows first letter of email
- Keyboard accessible
- Click outside to close

### 3. Layout Structure
```
┌─────────────────────────────────┐
│ Header (Logo | Nav | User Menu) │
├─────────────────────────────────┤
│                                 │
│         Page Content            │
│                                 │
├─────────────────────────────────┤
│     Footer (Links, ©)           │
└─────────────────────────────────┘
```

### 4. Responsive Behavior
- Desktop: Full nav + user menu
- Mobile: Responsive stacking (hamburger menu optional for future)

## What Needs Your Approval

### 1. Logo Design
**Proposed**: ₿ symbol + "CryptoTracker" text

**Alternatives**:
- Just text logo
- Different symbol (₿/⟠/⬡)
- Custom icon

**Your preference?**

### 2. Header Placement
**Proposed**: Header in root layout (appears on all pages)

**Alternatives**:
- Per-page headers (more flexibility, but less consistent)
- Sticky header (stays at top when scrolling)

**Your preference?**

### 3. Footer Content
**Proposed**: Minimal footer with:
- App name + copyright
- Placeholder links (Privacy, Terms, Docs)

**Alternatives**:
- Add social media links
- Add GitHub link
- Add "About" section

**Your preference?**

### 4. Navigation Items
**Proposed**: Just "Dashboard" link for MVP

**Future additions**:
- Portfolio list dropdown
- Settings page
- Help/Docs
- Notifications

**Add anything now?**

## Questions for You

1. **Logo**: Happy with ₿ + "CryptoTracker" or want something different?

2. **User Avatar**: First letter of email okay, or prefer generic icon?

3. **Footer Links**: Keep as placeholders or want them to go somewhere specific?

4. **Sticky Header**: Should header stick to top when scrolling, or flow with page?

5. **Mobile Menu**: Add hamburger menu now, or save for later?

6. **Timing**: Implement this now, or fix other issues first?

## Next Steps

**If Approved**:
1. I'll implement Phase 1 (create components)
2. Test components in isolation
3. Integrate into root layout
4. Update all pages
5. Test thoroughly
6. Commit with full documentation

**If Changes Needed**:
1. You tell me what to adjust
2. I'll update the spec
3. Then proceed with implementation

**Estimated Total Time**: 3-4 hours for full implementation + testing

## Current Session Status

**Completed Today**:
- ✅ Fixed portfolio creation bug (API response structure)
- ✅ Added proper padding to portfolio header
- ✅ Fixed critical price calculation bug (cost basis vs market value)
- ✅ Created T097 specification (this document)

**Test Status**: ✅ 130/130 passing (100%)

**Ready to proceed with T097 implementation?** Let me know your preferences and I'll get started!
