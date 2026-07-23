# Checklist device — PWA / Push / latencia percibida

Complementa [MOVIL-Y-PWA.md](./modulos/MOVIL-Y-PWA.md) y [UX-QA.md](./UX-QA.md).  
Objetivo: cerrar el último tramo a 10/10 con evidencia en dispositivo real.

## Prep (PC)

```powershell
# VAPID en .env.dev (o prod) — ver .env.example
npm run build
npm run preview
# o deploy a un HTTPS público (push requiere secure context)
```

Credenciales demo: `docs/TESTING.md` (`DEMO_PASSWORD`).

## Android — Chrome

| #   | Paso                                                               | OK  |
| --- | ------------------------------------------------------------------ | --- |
| A1  | Login `member@…` → inicio muestra tarjeta avisos (si no dismissed) | ☐   |
| A2  | Activar notificaciones → permiso sistema                           | ☐   |
| A3  | Perfil → Seguridad: toggle coherente                               | ☐   |
| A4  | Staff manda mensaje → notificación con app en segundo plano        | ☐   |
| A5  | Menú Chrome → Instalar app / Añadir a inicio                       | ☐   |

## iPhone — Safari 16.4+

| #   | Paso                                                                        | OK  |
| --- | --------------------------------------------------------------------------- | --- |
| I1  | Sin PWA: tarjeta **Añadir a Inicio para avisos** en inicio                  | ☐   |
| I2  | Compartir → Añadir a Inicio → abrir desde icono                             | ☐   |
| I3  | En standalone: Perfil → Seguridad → Activar push                            | ☐   |
| I4  | En pestaña Safari (sin Inicio): no fuerza push; copy de instalación visible | ☐   |

## Escritorio — latencia percibida

| #   | Paso                                                 | OK  |
| --- | ---------------------------------------------------- | --- |
| D1  | Login admin → Panel: skeleton, no texto “Cargando…”  | ☐   |
| D2  | Hover sidebar Miembros → abrir: lista casi inmediata | ☐   |
| D3  | Hover Pagos → cola pendientes precargada             | ☐   |
| D4  | Miembros/Pagos desktop: click fila → rail lateral    | ☐   |
| D5  | Reportes: preview de filas al seleccionar tarjeta    | ☐   |
| D6  | Settings xl: nav lateral con anclas                  | ☐   |

## Al cerrar

- [ ] Filas UX-QA push/PWA marcadas o con nota de OS
- [ ] Si índices aún no están en prod: `npm run db:migrate:prod` (confirmación explícita)
