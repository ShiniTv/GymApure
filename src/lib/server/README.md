# Convención `src/lib` — cliente vs servidor

Para reducir el “kitchen sink” compartido:

| Carpeta / patrón    | Uso                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/server/`   | Solo Node/Express (DB, crypto, bcrypt, otplib, pg). **No** importar desde páginas React. |
| `src/lib/client/`   | Solo browser (localStorage, haptics, SW helpers).                                        |
| `src/lib/*.ts` raíz | Shared puro (tipos, formatters, zod schemas sin `node:`).                                |

## Reglas

1. Nuevo helper de servidor → preferir `src/lib/server/<name>.ts` o re-export desde raíz si hay imports legacy.
2. No importar `../db`, `fs`, `crypto` (node) desde código que Vite empaquete para el cliente.
3. MFA crypto, session auth, password hash = servidor.

Migración gradual: nuevos módulos van a la subcarpeta; los existentes se mueven cuando se toquen.
