# Copiar configuración `.env` al otro equipo

Usa este documento en **dos pantallas**: este PC (con `.env` real) y el otro PC (donde crearás el nuevo `.env`).

> **Seguridad:** Este archivo solo tiene **placeholders**. Los valores secretos los copias tú del `.env` de tu PC principal. **No subas** un `.env` con contraseñas a GitHub.

---

## En el PC principal (este)

1. Abre el archivo `.env` en la raíz del proyecto (`caribean-gym\.env`).
2. Selecciona y copia cada valor según la plantilla de abajo.

---

## En el otro PC

1. Después de `git clone` y `npm install`:
   ```powershell
   copy .env.example .env
   ```
2. Abre `.env` y **sustituye todo** por el bloque de abajo, pegando tus valores reales donde dice `PEGAR_AQUI`.
3. Guarda, luego:
   ```powershell
   npm run db:migrate
   npm run dev
   ```

---

## Plantilla completa — copiar al `.env` del otro PC

```env
# === OBLIGATORIO ===
JWT_SECRET=PEGAR_AQUI

DATABASE_URL=PEGAR_AQUI

SUPABASE_SERVICE_ROLE_KEY=PEGAR_AQUI

NODE_ENV=development
PORT=3000

# === KIOSK (check-in /check-in) — deben ser IGUALES ===
KIOSK_API_KEY=PEGAR_AQUI
VITE_KIOSK_KEY=PEGAR_AQUI

# === Solo tests automáticos (opcional) ===
DEMO_PASSWORD=PEGAR_AQUI

# === EMAIL (opcional — dejar SMTP_PASS vacío si aún no tienes contraseña de aplicación Google) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=PEGAR_AQUI
SMTP_PASS=PEGAR_AQUI
SMTP_FROM=PEGAR_AQUI

# === OPCIONAL — descomenta si los usas ===
# ADMIN_NOTIFY_EMAILS=PEGAR_AQUI
# VITE_EXCHANGE_RATE=40.5
# WHATSAPP_PROVIDER=meta
# WHATSAPP_ACCESS_TOKEN=PEGAR_AQUI
# WHATSAPP_PHONE_NUMBER_ID=PEGAR_AQUI
# WHATSAPP_API_VERSION=v21.0
```

---

## Qué pegar en cada línea (desde tu `.env` actual)

| Línea en plantilla | Qué copiar del `.env` de este PC |
|--------------------|----------------------------------|
| `JWT_SECRET` | Misma línea completa |
| `DATABASE_URL` | Misma línea completa |
| `SUPABASE_SERVICE_ROLE_KEY` | Misma línea completa |
| `KIOSK_API_KEY` | Misma línea completa |
| `VITE_KIOSK_KEY` | Misma línea completa (debe coincidir con kiosk) |
| `DEMO_PASSWORD` | Misma línea (opcional) |
| `SMTP_USER` | Tu Gmail configurado |
| `SMTP_PASS` | Contraseña de aplicación Google (16 caracteres) |
| `SMTP_FROM` | Ej. `Caribean Gym <tu@gmail.com>` |

---

## Ejemplo visual (así debe quedar, con tus datos reales)

```env
JWT_SECRET=abc123xyz789...minimo_32_caracteres...
DATABASE_URL=postgresql://postgres.xxxxx:TU_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NODE_ENV=development
PORT=3000
KIOSK_API_KEY=clave_larga_aleatoria_16_chars
VITE_KIOSK_KEY=clave_larga_aleatoria_16_chars
SMTP_USER=tu@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=Caribean Gym <tu@gmail.com>
```

---

## Atajo más rápido

Si tienes USB, email privado o OneDrive:

1. Copia el archivo **`.env` entero** de este PC.
2. Pégalo en la carpeta `caribean-gym` del otro PC (reemplaza el `.env` vacío).
3. `npm install` → `npm run db:migrate` → `npm run dev`

No hace falta reescribir línea por línea.

---

## Después de pegar el `.env`

```powershell
cd caribean-gym
npm run db:migrate
npm run dev
```

Abre: **http://localhost:3000**  
Login con tu **mismo admin** (misma Supabase = mismos usuarios).

---

## Checklist

- [ ] `.env` copiado o plantilla completada
- [ ] `KIOSK_API_KEY` = `VITE_KIOSK_KEY`
- [ ] `npm run db:migrate`
- [ ] `npm run dev`
- [ ] Login admin OK en http://localhost:3000

Guía extendida: [SETUP-OTRO-EQUIPO.md](./SETUP-OTRO-EQUIPO.md)
