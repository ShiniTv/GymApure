# Inicio rápido — Poner el gym operativo

Guía de 15 pasos para pasar de instalación vacía a un gimnasio listo para operar. Para detalle técnico, ver [tecnico/INSTALACION-NUEVO-EQUIPO.md](./tecnico/INSTALACION-NUEVO-EQUIPO.md).

---

## Parte A — Instalación (técnico)

| #   | Paso                      | Comando / acción                                    |
| --- | ------------------------- | --------------------------------------------------- |
| 1   | Clonar el repositorio     | `git clone https://github.com/ShiniTv/GymApure.git` |
| 2   | Instalar dependencias     | `npm install`                                       |
| 3   | Separar entornos          | `npm run env:init`                                  |
| 4   | Configurar dev            | `npm run env:configure-dev -- <password>`           |
| 5   | Setup base dev            | `npm run db:setup:dev`                              |
| 6   | Verificar entornos        | `npm run env:check`                                 |
| 7   | Crear administrador local | `npm run db:create-admin:dev`                       |
| 8   | Arrancar servidor         | `npm run dev` → `http://localhost:3000`             |
| 9   | Verificar API             | `GET /api/health` → `{ "status": "ok" }`            |
| 10  | Smoke tests (opcional)    | `npm run test:smoke:dev`                            |

**Resultado esperado:** puedes iniciar sesión como admin en `/login`.

---

## Parte B — Configuración inicial (admin)

| #   | Paso                              | Dónde                                                                  |
| --- | --------------------------------- | ---------------------------------------------------------------------- |
| 11  | Configurar alertas de vencimiento | **Configuración** → días de anticipación → Guardar                     |
| 12  | Revisar tipo de cambio USD (BCV)  | **Configuración** → Tasa de cambio → verificar valor o override manual |
| 13  | Crear planes de membresía         | **Membresías** → Nuevo plan (nombre, duración, precio)                 |
| 14  | Crear primer miembro o staff      | **Miembros** → Nuevo usuario (rol, cédula, contraseña inicial)         |
| 15  | Registrar primer pago (opcional)  | **Pagos** → Nuevo pago → subir comprobante                             |

**Resultado esperado:** al menos un plan activo, un miembro registrado y alertas configuradas.

---

## Próximos pasos recomendados

1. Crear cuenta de **recepcionista** en Miembros → Nuevo usuario (rol `receptionist`).
2. Crear cuenta de **entrenador** y asignarle miembros.
3. El entrenador crea una **rutina** para el miembro.
4. El miembro inicia sesión y prueba **Empezar entrenamiento** desde Inicio o Rutinas.

---

## Si algo falla

| Problema               | Solución                                              |
| ---------------------- | ----------------------------------------------------- |
| `db:health` falla      | Revisar `DATABASE_URL`, firewall, contraseña Supabase |
| Login no funciona      | Verificar que `db:create-admin` terminó sin error     |
| Pantalla en blanco     | Revisar consola del navegador; correr `npm run lint`  |
| Migraciones pendientes | `npm run db:migrate` tras cada `git pull`             |

Ver [tecnico/ENTORNOS-Y-SEGURIDAD.md](./tecnico/ENTORNOS-Y-SEGURIDAD.md) antes de ejecutar comandos destructivos.

---

## Enlaces

- [Manual administrador](./manual/MANUAL-ADMIN.md)
- [Despliegue a producción](./DEPLOY.md)
- [Variables de entorno](./tecnico/VARIABLES-ENTORNO.md)
