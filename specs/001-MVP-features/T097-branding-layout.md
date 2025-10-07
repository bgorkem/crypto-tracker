# T097: Branding & Layout Components

**Parent**: 001-MVP-features  
**Status**: 📋 Planning  
**Priority**: High  
**Estimated Effort**: 3-4 hours

## Overview
Add consistent branding (logo, header, footer) and user account menu across all pages to improve navigation and user experience.

## Problem Statement
Currently:
- No consistent header/navigation across pages
- No logo or branding identity
- No visible user account menu with email/logout
- Each page has inconsistent layout structure
- Users can't easily navigate between pages
- No visual indication of logged-in state

## Requirements

### Functional Requirements
1. **Header Component**
   - Display app logo (₿ symbol + "CryptoTracker" text)
   - Logo links to dashboard (if logged in) or home (if logged out)
   - Show navigation links for authenticated users (Dashboard)
   - Show "Sign In" and "Get Started" buttons for unauthenticated users
   - Display user account menu for authenticated users

2. **User Account Menu**
   - Avatar with user's first letter or icon
   - Dropdown menu showing:
     - User's email address
     - Logout button
   - Accessible via keyboard navigation
   - Click outside to close

3. **Footer Component**
   - App name and tagline
   - Current year copyright
   - Links: Privacy Policy, Terms of Service, Documentation (can be placeholders)
   - Optional: Social media links

4. **Layout Integration**
   - Apply header to all pages: landing, auth (login/register), dashboard, portfolio detail
   - Apply footer to all pages
   - Maintain consistent container width and padding
   - Responsive design (mobile + desktop)

### Non-Functional Requirements
1. **Performance**
   - No layout shift when header loads
   - User menu loads instantly (no API calls)
   
2. **Accessibility**
   - Keyboard navigable menu
   - ARIA labels for dropdown
   - Semantic HTML (header, nav, footer)
   - Screen reader friendly

3. **Design**
   - Consistent with existing UI (Tailwind, shadcn/ui)
   - Mobile responsive (hamburger menu if needed)
   - Clean, minimal design

## Technical Design

### Components to Create

1. **`components/layout/Header.tsx`**
   ```tsx
   interface HeaderProps {
     user?: { email: string } | null;
     onLogout?: () => Promise<void>;
   }
   ```
   - Detects auth state via props
   - Shows appropriate navigation
   - Includes UserAccountMenu when authenticated

2. **`components/layout/UserAccountMenu.tsx`**
   ```tsx
   interface UserAccountMenuProps {
     user: { email: string };
     onLogout?: () => Promise<void>;
   }
   ```
   - Uses shadcn DropdownMenu component
   - Shows avatar with first letter of email
   - Displays email and logout button

3. **`components/layout/Footer.tsx`**
   - Simple static component
   - Responsive link layout
   - Copyright with current year

4. **`components/layout/AppLayout.tsx`** (Optional wrapper)
   - Combines Header + children + Footer
   - Handles auth state fetching
   - Provides consistent layout structure

### Files to Modify

1. **`app/layout.tsx`** (Root layout)
   - Add Header with auth state detection
   - Add Footer
   - Remove any conflicting nav elements

2. **`app/dashboard/page.tsx`**
   - Remove existing logout button
   - Remove any duplicate header elements
   - Use centralized Header

3. **`app/portfolio/[id]/page.tsx`**
   - Remove back button from PortfolioHeader
   - Use centralized navigation
   - Keep portfolio-specific actions (Edit, Delete, Add Transaction)

4. **Auth pages** (`app/auth/login/page.tsx`, `app/auth/register/page.tsx`)
   - Already have minimal layout
   - Just add Header (shows logo, no auth menu)
   - Add Footer

## Implementation Plan

### Phase 1: Create Core Components (1.5h)
- [ ] Create `components/layout/Footer.tsx`
- [ ] Create `components/layout/UserAccountMenu.tsx` with shadcn DropdownMenu
- [ ] Create `components/layout/Header.tsx`
- [ ] Test components in isolation

### Phase 2: Root Layout Integration (1h)
- [ ] Modify `app/layout.tsx` to include Header + Footer
- [ ] Fetch auth state in layout
- [ ] Pass user to Header component
- [ ] Test on all pages

### Phase 3: Page-Specific Updates (1h)
- [ ] Update dashboard page (remove duplicate logout)
- [ ] Update portfolio detail page (adjust header, keep portfolio actions)
- [ ] Update auth pages (ensure header shows but no auth menu)
- [ ] Verify navigation flow

### Phase 4: Polish & Testing (0.5h)
- [ ] Responsive design check (mobile/tablet/desktop)
- [ ] Accessibility audit (keyboard nav, ARIA)
- [ ] Visual consistency check
- [ ] Update tests if needed

## Acceptance Criteria

### Visual Requirements
- ✅ Logo (₿ + "CryptoTracker") appears on all pages
- ✅ Header is sticky/fixed at top (optional) or flows with page
- ✅ User avatar shows first letter of email
- ✅ Footer appears at bottom of all pages
- ✅ Consistent spacing and alignment

### Functional Requirements
- ✅ Logo links to correct page (dashboard if logged in, home if not)
- ✅ User menu shows email address
- ✅ Logout button works and redirects to login
- ✅ Navigation links highlight current page
- ✅ Dropdown menu opens/closes correctly
- ✅ Mobile responsive (no overflow, proper stacking)

### Integration Requirements
- ✅ No duplicate headers/footers
- ✅ No duplicate logout buttons
- ✅ Portfolio page keeps its action buttons (Edit, Delete, Add Transaction)
- ✅ All existing functionality preserved
- ✅ All tests still passing

## Testing Strategy

### Unit Tests
- [ ] Header renders correctly with/without user
- [ ] UserAccountMenu shows email and logout button
- [ ] Footer renders with correct links

### Integration Tests
- [ ] Header appears on all pages
- [ ] User menu only shows when authenticated
- [ ] Logout flow works correctly

### E2E Tests
- [ ] Navigate between pages via header links
- [ ] Click user menu and logout
- [ ] Verify logo navigation

### Manual Testing Checklist
- [ ] Check all pages: landing, login, register, dashboard, portfolio detail
- [ ] Test logout flow
- [ ] Test navigation between pages
- [ ] Verify responsive design on mobile
- [ ] Test keyboard navigation
- [ ] Verify no console errors

## Dependencies
- shadcn/ui DropdownMenu component
- Existing auth infrastructure (useAuth hook or similar)
- Tailwind CSS for styling

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Layout shift when auth loads | Medium | Pre-render header with placeholder, hydrate user state |
| Breaking existing navigation | High | Test all pages thoroughly, keep portfolio actions intact |
| Mobile menu overflow | Low | Use responsive Tailwind classes, test on small screens |
| Auth state sync issues | Medium | Use single source of truth (root layout or context) |

## Success Metrics
- All pages have consistent header/footer
- User can navigate via header on all pages
- User can logout from any page
- Zero layout shift or visual bugs
- All existing tests pass
- New visual consistency improves UX

## Follow-up Tasks
- T098: Add user profile page (optional)
- T099: Add notifications/alerts in header (optional)
- T100: Add dark mode toggle in header (optional)
- T101: Add search functionality in header (future)

## Notes
- Keep design minimal and clean
- Use shadcn/ui components for consistency
- Ensure accessibility (ARIA, keyboard nav)
- Mobile-first responsive design
- Maintain performance (no heavy auth checks in header)
