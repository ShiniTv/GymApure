# Finanzas operativas vNext (oleada 2)

Alcance **no ERP**. Entregado 2026-09:

| Capacidad           | Dónde                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| Caja del día        | Panel admin · `revenueToday` + tarjeta “Cierre de caja”                 |
| Cola CxC            | `/payments?status=pending` (+ badge +2 días)                            |
| Conciliación ligera | Reportes → **Conciliación** (`GET /api/reports/reconciliation`)         |
| P&L simple          | Ingresos = pagos aprobados (panel + reporte Pagos); sin gastos manuales |
| Exportes            | CSV/PDF existentes + conciliación                                       |

Fuera de alcance: asientos, SENIAT/IVA, Stripe, POS, multi-sede.
