# Roadmap diferido — escalabilidad de negocio (P3)

Estas capacidades **no se implementan** hasta validar demanda real. La landing de leads (`/solicitar-demo` + `demo_requests`) ya captura interés. El inbox admin de demos está en `/demo-leads`.

**Estado (julio 2026):** Fase D del plan de producto permanece **a demanda**. No implementar multi-sede, Stripe ni POS hasta las señales de la tabla.

---

## Diferido a demanda

| Capacidad                               | Por qué esperar                                                                         | Señal para empezar                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Multi-sede / sucursales**             | Un solo local es el fit actual; multi-sede toca auth, membresías, inventario y reportes | 2+ sedes operando o cliente pagando SaaS multi-local    |
| **CRM de leads avanzado**               | Hoy basta `demo_requests` + bandeja admin (`/demo-leads`)                               | Cola de demos >5/semana o equipo comercial dedicado     |
| **Retail / POS**                        | Equipamiento CMMS no es tienda; POS implica inventario SKU, caja e impuestos            | Venta recurrente de productos en mostrador              |
| **Pasarela de tarjeta (Stripe u otra)** | Pagos con comprobante + BCV encajan en VE                                               | Demanda explícita de cobro online y método local viable |

---

## Ya entregado en esta fase

- Landing pública `/solicitar-demo`
- API `POST /api/demo-requests`
- Migración `20260717000002_demo_requests.sql`
- Inbox admin `/demo-leads` (listar / marcar contactado / cerrado)

---

## Enlaces

- [Análisis y roadmap de producto](../README.md)
- [Arquitectura](./tecnico/ARQUITECTURA.md)
