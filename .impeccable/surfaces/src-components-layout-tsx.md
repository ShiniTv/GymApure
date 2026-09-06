---
version: 1
slug: 'src-components-layout-tsx'
primary_target: 'src/components/Layout.tsx'
related_targets:
  [
    'src/index.css',
    'src/components/navigation/StaffBottomNav.tsx',
    'src/components/member/MemberBottomNav.tsx',
  ]
---

# Surface: App shell sidebar

Mode: Operate · Scope: desktop sidebar + mobile drawer chrome for all roles

## Direction contract

THESIS: Quiet Operate navigation rail — hairline selection, brand mark in well, account card footer; never brand-tint active rows.
OWN-WORLD: Apple Operate — elevated sidebar, system type chrome 13px, sky only on badges/logo well.
STORY: Staff/member scans sections, jumps, sees unread, opens profile or leaves — without competing with the canvas.
FIRST VIEWPORT: Brand + current page meta; sectioned links; theme / profile / logout.
FORM: Shared `.nav-link*` + `.nav-user-card` tokens; mobile drawer shares modal-grade scrim.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
