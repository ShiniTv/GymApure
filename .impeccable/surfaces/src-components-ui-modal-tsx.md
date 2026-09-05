---
version: 1
slug: 'src-components-ui-modal-tsx'
primary_target: 'src/components/ui/Modal.tsx'
related_targets:
  [
    'src/components/LogoutConfirmModal.tsx',
    'src/pages/routines/RoutineModals.tsx',
    'src/pages/members/MemberActionModals.tsx',
    'src/components/ui/Sheet.tsx',
  ]
---

# Surface: System Modal

Mode: Operate · Scope: shared dialog primitive across roles

## Direction contract

THESIS: Premium Apple Operate dialogs — dimmed canvas, elevated panel, clear header/body/footer; mobile docks as soft sheet.
OWN-WORLD: Apple Operate — system type, hairlines, sky accent only on CTAs/status, `--radius-modal` / `--shadow-modal`.
STORY: User is interrupted only for a focused task or confirm; actions are obvious; Escape and focus trap always work.
FIRST VIEWPORT: Title (+ optional description/icon), primary content, sticky footer actions when present.
FORM: Shared `Modal` + `ModalActions`; confirms use `tone`, `description`, `footer`.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
