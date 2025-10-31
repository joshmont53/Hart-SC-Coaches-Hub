# Design Guidelines: Swimming Coaching Session Logging Platform

## Design Approach: Productivity-Focused System

**Selected Framework**: Clean productivity system inspired by Linear's clarity + Notion's information hierarchy + Material Design's form patterns

**Rationale**: This is a utility-focused, information-dense application used by coaches at poolside on tablets/phones. The design must prioritize efficiency, learnability, and mobile usability over aesthetic flourish. Coaches need to quickly log detailed session data in real-world pool environments.

**Core Principles**:
1. Mobile-first design for poolside tablet/phone use
2. Clarity over decoration - every element serves a function
3. Generous touch targets for wet hands/gloves
4. Progressive disclosure - show complexity only when needed
5. Instant visual feedback for all actions

---

## Typography

**Font Stack**: Inter (via Google Fonts CDN)
- **Display/Headers**: Inter Bold, sizes 32/24/20/18
- **Body Text**: Inter Regular/Medium, size 16 (mobile) / 14 (desktop)
- **Form Labels**: Inter Medium, size 14, tracking-wide for clarity
- **Data/Numbers**: Inter SemiBold, tabular numerals for alignment
- **Small Text/Meta**: Inter Regular, size 12

**Hierarchy Rules**:
- Page titles: Bold, 24-32px depending on viewport
- Section headers: SemiBold, 18-20px
- Form labels: Medium, 14px, all-caps with letter-spacing
- Input text: Regular, 16px (critical for mobile readability)
- Helper text: Regular, 12px

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16, 24**
- Component padding: p-4 (mobile), p-6 (desktop)
- Section spacing: mb-8 to mb-12
- Form field gaps: gap-4 to gap-6
- Card padding: p-6 (mobile), p-8 (desktop)
- Page margins: px-4 (mobile), px-6 (tablet), px-8 (desktop)

**Grid System**:
- Mobile: Single column, full-width forms
- Tablet: 2-column forms for efficiency
- Desktop: max-w-6xl centered container, 2-3 column layouts where appropriate

**Responsive Breakpoints**:
- Mobile-first base styles
- md: 768px (tablet landscape)
- lg: 1024px (desktop)
- All forms stack to single column below md breakpoint

---

## Component Library

### Navigation & Layout

**Top Navigation Bar**:
- Fixed header, h-16, shadow-sm
- Left: App logo/name + hamburger menu (mobile)
- Center: Quick navigation tabs (desktop): "Sessions" | "Calendar" | "Swimmers" | "New Session"
- Right: Coach name with avatar, logout icon
- Mobile: Collapsible slide-out menu

**Dashboard Layout**:
- Tabbed interface for "Upcoming Sessions" | "Past Sessions" | "My Calendar"
- Filter chips for quick filtering (by squad, by pool, by date range)
- Action button (FAB on mobile): "+ New Session" - fixed bottom-right, size-16, shadow-lg

### Forms & Inputs

**Session Creation Form**:
- Multi-step wizard approach: (1) Basic Info → (2) Stroke Distances → (3) Attendance
- Progress indicator at top showing current step
- Each step is a full-screen card with generous padding
- Large, clear section headers dividing form sections

**Input Fields**:
- Height: h-12 (touch-friendly 48px minimum)
- Border: border-2 with rounded-lg corners
- Labels: Above input, mb-2, with required asterisk if applicable
- Placeholder text for guidance
- Focus state: prominent border treatment

**Dropdown Selects**:
- Same h-12 height as text inputs
- Custom styled with chevron-down icon (Heroicons)
- Modal picker on mobile for better UX
- Searchable for longer lists (coach selection, swimmer lists)

**Number Inputs** (Distance Fields):
- Grouped by stroke type in expandable accordion sections
- 4-column grid (Swim | Drill | Kick | Pull) on tablet+
- Stack to 2 columns on mobile
- Units displayed inline (meters): "250m" suffix
- Auto-calculation of totals displayed prominently

**Date/Time Pickers**:
- Native HTML5 pickers for mobile compatibility
- Custom styled for desktop
- Duration auto-calculated from start/end time

**Toggle Groups** (Focus Type):
- Large button group, min-h-12 per option
- Single-select radio behavior
- Options: Aerobic Capacity | Anaerobic Capacity | Speed | Technique | Recovery
- Full-width on mobile, inline on tablet+

### Data Display

**Session Cards** (Dashboard):
- Rounded-xl cards with shadow-md
- p-6 padding
- Header row: Session date (large) + Pool name + Edit icon
- Key info row: Squad | Lead Coach | Time | Duration
- Quick stats row: Total Distance | Focus Type
- Attendance summary: "12/15 swimmers attended"
- Tap entire card to view details

**Calendar View**:
- Monthly grid calendar
- Sessions displayed as chips/badges on dates
- Tapping date shows session list for that day
- Mobile: Vertical scrolling list grouped by week
- Desktop: Traditional month grid view

**Attendance Table**:
- Swimmer list with checkboxes and status dropdown
- Columns: Swimmer Name | Status | Notes
- Status options: Present (default) | Late | Very Late | First Half | Second Half | Absent
- Quick "Mark All Present" button at top
- Search/filter swimmers by name

**Session Detail View**:
- Hero section: Date, Pool, Time prominently displayed
- Metadata grid: Coaches, Helper, Set Writer in bordered sections
- Expandable stroke breakdown accordion (collapsed by default to reduce overwhelm)
- Attendance section showing swimmer list with status badges
- Edit/Delete actions in top-right

### Interactive Elements

**Buttons**:
- Primary: h-12, px-8, rounded-lg, medium weight text
- Secondary: h-12, px-6, rounded-lg, bordered
- Icon buttons: size-10 to size-12 (touch-friendly)
- Floating Action Button (mobile): size-16, rounded-full, shadow-xl

**Icons**: Heroicons (outline style) via CDN
- Navigation icons: size-6
- Action icons: size-5
- Inline icons: size-4
- Consistent visual weight throughout

**Status Badges**:
- Small pills for session status, attendance status
- rounded-full, px-3, py-1, text-xs font-medium
- Present, Late, Absent, etc. each with distinct treatment

**Loading States**:
- Skeleton screens for data loading (cards, tables)
- Spinner for form submissions (inline with button)
- Subtle pulse animation for skeletons

### Modals & Overlays

**Confirmation Dialogs**:
- Centered modal, max-w-md
- Clear action buttons (Cancel | Confirm)
- Used for delete confirmations, session overwrites

**Mobile Slide-ups**:
- Bottom sheet pattern for pickers and secondary actions
- Dismissible with swipe-down gesture
- Backdrop with opacity for context

---

## Page-Specific Guidelines

### Login Page
- Centered card on clean background, max-w-sm
- Logo/app name at top
- "Log in with Replit" button (Replit Auth)
- Social login options (Google, GitHub) stacked vertically
- Each login button: h-12, full-width, with provider icon

### Dashboard (Home)
- Top navigation with active tab indicator
- Filter bar below nav (squad, date range, pool)
- Session cards in vertical list (mobile) or 2-column grid (tablet+)
- Empty state: Illustration + "No sessions yet" + "Create Session" CTA
- Pull-to-refresh on mobile

### New Session Flow
- Step 1 (Basic Info): Date, Time, Pool, Squad, Coaches, Focus
- Step 2 (Distances): Accordion sections by stroke, auto-calculating totals shown prominently
- Step 3 (Attendance): Searchable swimmer list with quick status selection
- Fixed footer: "Back" | "Next/Save" buttons
- Auto-save draft to prevent data loss

### Calendar View
- Month selector at top
- Grid view (desktop) / List view (mobile)
- Session indicators on dates
- Filter by coach (show only my sessions toggle)

### Swimmer/Coach/Squad Management
- Simple CRUD tables with inline editing
- Add new button in top-right
- Search/filter bar above table
- Mobile: Card layout instead of table

---

## Accessibility & Interactions

- Minimum touch target: 44x44px (WCAG AAA)
- Form validation: Inline error messages below fields
- Success feedback: Toast notifications, top-center, auto-dismiss
- Error states: Border treatment + icon + helper text
- Loading states: Button disabled + spinner
- Focus indicators: Prominent border treatment for keyboard navigation
- Consistent implementation across all inputs and interactive elements

---

## Mobile Considerations

- Fixed header (doesn't scroll away)
- Large form inputs (h-12 minimum for 48px touch targets)
- Bottom navigation or FAB for primary actions
- Horizontal scrolling for wide tables
- Pull-to-refresh for data lists
- Swipe gestures for navigation (back, delete)
- Modal bottom sheets instead of center modals
- Sticky "Save" buttons in forms

---

## Images

**No hero images required** - This is a utility application focused on data entry and management.

**Avatar images**: 
- Coach profile photos in navigation (circular, size-10)
- Swimmer avatars in attendance lists (optional, size-8)
- Placeholder initials in circles for users without photos

**Empty state illustrations**:
- Simple SVG illustrations for "No sessions yet" states
- Use icon-based graphics, not photographic images
- Keep illustrations minimal and functional