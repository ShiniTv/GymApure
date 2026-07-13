# Proyectos Supabase — GymApure

Referencia canónica para no confundir **nombre en el dashboard** con **rol real** del entorno.

---

## Mapa actual (julio 2026)

| Nombre en Supabase Dashboard | Ref                    | Rol                  | Archivo local | Render              |
| ---------------------------- | ---------------------- | -------------------- | ------------- | ------------------- |
| **GymApure – Desarrollo**    | `sqjyxmbtgmiorckigrrg` | Desarrollo / pruebas | `.env.dev`    | No                  |
| **GymApure – Producción**    | `ffjwvlcwhyskddqqojnp` | Gym en vivo          | `.env.prod`   | Sí (`DATABASE_URL`) |

**Regla:** el ref dentro de `DATABASE_URL` (`postgres.XXXXXXXX`) es la fuente de verdad — no el nombre visual del proyecto.

---

## Enlaces directos

| Entorno    | Dashboard                                                   |
| ---------- | ----------------------------------------------------------- |
| Desarrollo | https://supabase.com/dashboard/project/sqjyxmbtgmiorckigrrg |
| Producción | https://supabase.com/dashboard/project/ffjwvlcwhyskddqqojnp |

---

## Qué hacer en cada proyecto

| Acción                                      | Proyecto Supabase                            |
| ------------------------------------------- | -------------------------------------------- |
| `npm run dev`, `db:restore-demo`, pruebas   | **GymApure – Desarrollo**                    |
| SQL manual de datos reales, backups prod    | **GymApure – Producción**                    |
| `npm run db:migrate:prod`, `db:health:prod` | Conecta a **Producción** vía `.env.prod`     |
| MFA del staff del gym                       | Cuentas en la app Render (BD **Producción**) |

---

## Rotar contraseña de base de datos

| Entorno    | Comando                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Desarrollo | Supabase → **Desarrollo** → Database → Reset password → `npm run env:configure-dev -- <password>`                                   |
| Producción | Supabase → **Producción** → Database → Reset password → `npm run env:configure-prod -- <password>` → pegar `DATABASE_URL` en Render |

---

## Nota histórica

Hasta julio 2026 los proyectos se llamaban **CARIBEAN GYM Project** y **CARIBEAN GYM Producción**, con nombres **invertidos** respecto al rol real (el que decía “Producción” en el dashboard era desarrollo local). Se renombraron a **GymApure – Desarrollo** y **GymApure – Producción** para alinearlos con el código y Render.

---

## Verificación rápida

```powershell
npm run env:check
```

Debe mostrar:

- `.env.dev` → DESARROLLO → `sqjyxmbtgmiorckigrrg`
- `.env.prod` → PRODUCCIÓN → `ffjwvlcwhyskddqqojnp`

---

## Enlaces

- [Entornos y seguridad](./ENTORNOS-Y-SEGURIDAD.md)
- [Variables de entorno](./VARIABLES-ENTORNO.md)
- [Rotación de secretos](./ROTACION-SECRETOS.md)
- [Staging](./STAGING.md)
