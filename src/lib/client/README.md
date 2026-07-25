# Client-only helpers

Put browser-only utilities here (DOM, `localStorage`, Notification API wrappers).
Shared pure formatters stay in `src/lib/` root.

Pages under `src/pages/` must never import `src/lib/server` (including relative or `@/lib/server`
paths). CI enforces this boundary so Node-only dependencies cannot leak into the browser bundle.
