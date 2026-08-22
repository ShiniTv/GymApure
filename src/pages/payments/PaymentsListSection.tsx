import { Link } from 'react-router';
import { Plus, Check, X, CreditCard } from 'lucide-react';
import {
  Button,
  Card,
  PaginationBar,
  Badge,
  EmptyState,
  IconButton,
  ListRowSkeleton,
  TableRowSkeleton,
} from '../../components/ui';
import {
  formatPaymentDate,
  formatPaymentMethod,
  paymentStatusLabel,
  paymentStatusVariant,
  type Payment,
} from './helpers';
import { ProofPreviewButton } from './ProofPreviewButton';
import { PaymentMobileCard } from './PaymentMobileCard';
import { PaymentDetailRail } from './PaymentDetailRail';
import { cn } from '../../lib/utils';
import { Virtuoso } from 'react-virtuoso';

function staffEmptyCopy(input: { search: string; stalePending: boolean; statusFilter: string }): {
  title: string;
  description: string;
} {
  if (input.search) {
    return {
      title: 'Sin resultados',
      description: 'Prueba otro nombre o referencia, o limpia la búsqueda.',
    };
  }
  if (input.stalePending) {
    return {
      title: 'Sin pendientes viejos',
      description: 'No hay pagos pendientes de más de 2 días.',
    };
  }
  if (input.statusFilter === 'pending') {
    return {
      title: 'Sin pagos pendientes',
      description: 'La cola de revisión está vacía. Los nuevos reportes aparecerán aquí.',
    };
  }
  if (input.statusFilter === 'approved') {
    return {
      title: 'Sin pagos aprobados',
      description: 'Cuando apruebes un pago, quedará listado en esta pestaña.',
    };
  }
  if (input.statusFilter === 'rejected') {
    return {
      title: 'Sin pagos rechazados',
      description: 'No hay pagos rechazados en el filtro actual.',
    };
  }
  return {
    title: 'Sin pagos registrados',
    description: 'Los reportes de miembros aparecerán aquí para revisión.',
  };
}

export interface PaymentsListSectionProps {
  isMember: boolean;
  isStaffPayment: boolean;
  showDetailRail: boolean;
  loading: boolean;
  paymentsError: boolean;
  onRetry: () => void;
  payments: Payment[];
  displayPayments: Payment[];
  search: string;
  statusFilter: string;
  stalePending: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onClearStatusFilter: () => void;
  onOpenRegister: () => void;
  selectedPayment: Payment | null;
  onSelectedPaymentChange: (payment: Payment | null) => void;
  onProofPreview: (payment: Payment) => void;
  onApprove: (payment: Payment) => void;
  onReject: (payment: Payment) => void;
}

export function PaymentsListSection({
  isMember,
  isStaffPayment,
  showDetailRail,
  loading,
  paymentsError,
  onRetry,
  payments,
  displayPayments,
  search,
  statusFilter,
  stalePending,
  page,
  pageSize,
  total,
  onPageChange,
  onClearStatusFilter,
  onOpenRegister,
  selectedPayment,
  onSelectedPaymentChange,
  onProofPreview,
  onApprove,
  onReject,
}: PaymentsListSectionProps) {
  if (paymentsError) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No se pudieron cargar los pagos"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (isMember && !loading && payments.length === 0 && !statusFilter) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center py-4">
        <EmptyState
          variant="motivational"
          icon={CreditCard}
          title="Aún sin pagos"
          description="Usa Reportar pago arriba para enviar tu comprobante y activar la membresía."
          className="border-0 bg-transparent shadow-none"
        />
      </div>
    );
  }

  if (isMember && !loading && payments.length === 0 && statusFilter) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center py-3">
        <EmptyState
          variant="motivational"
          icon={CreditCard}
          title="Sin resultados"
          description={
            statusFilter === 'pending'
              ? 'No tienes pagos pendientes de revisión.'
              : statusFilter === 'approved'
                ? 'Aún no tienes pagos aprobados.'
                : 'No tienes pagos rechazados.'
          }
          action={
            <Button size="sm" variant="secondary" onClick={onClearStatusFilter}>
              Ver todos
            </Button>
          }
          className="border-0 bg-transparent shadow-none"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="payments-list"
      className={cn(
        isStaffPayment &&
          showDetailRail &&
          selectedPayment &&
          'md:grid md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-start md:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-4'
      )}
    >
      <Card
        padding="none"
        rounded="xl"
        className={cn(
          'min-w-0 overflow-hidden',
          'lg:border-border lg:bg-surface border-0 bg-transparent shadow-none lg:border lg:shadow-sm'
        )}
      >
        {isMember ? (
          <>
            <div className="mx-auto w-full max-w-lg space-y-2 lg:hidden">
              {loading ? (
                <ListRowSkeleton rows={4} />
              ) : (
                <>
                  {payments.map((payment) => (
                    <PaymentMobileCard
                      key={payment.id}
                      payment={payment}
                      onProofPreview={onProofPreview}
                    />
                  ))}
                </>
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="text-text-muted w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised text-text-muted text-[10px] font-semibold sm:text-xs">
                  <tr>
                    <th className="px-3 py-2.5 lg:px-5">Monto (USD)</th>
                    <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                    <th className="px-3 py-2.5 lg:px-5">Método</th>
                    <th className="px-3 py-2.5 lg:px-5">Referencia</th>
                    <th className="px-3 py-2.5 lg:px-5">Comprobante</th>
                    <th className="px-3 py-2.5 lg:px-5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-border-subtle divide-y">
                  {loading ? (
                    <>
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                    </>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-text-muted px-5 py-8 text-center text-sm">
                        No hay pagos registrados
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-surface-raised transition-colors">
                        <td className="text-text px-3 py-2.5 font-semibold tabular-nums lg:px-5">
                          ${payment.amount_usd}
                        </td>
                        <td className="text-text-muted px-3 py-2.5 whitespace-nowrap lg:px-5">
                          {formatPaymentDate(payment.created_at)}
                        </td>
                        <td className="text-text-muted px-3 py-2.5 capitalize lg:px-5">
                          {formatPaymentMethod(payment.method)}
                        </td>
                        <td
                          className="text-text-muted max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] lg:max-w-[16rem] lg:px-5"
                          title={payment.reference}
                        >
                          {payment.reference}
                        </td>
                        <td className="px-3 py-2.5 lg:px-5">
                          {payment.proof_url ? (
                            <ProofPreviewButton onClick={() => onProofPreview(payment)} />
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 lg:px-5">
                          <Badge
                            variant={paymentStatusVariant(payment.status)}
                            className="px-1.5 py-0 text-[9px]"
                          >
                            {paymentStatusLabel(payment.status)}
                          </Badge>
                          {payment.status === 'rejected' && (
                            <p className="mt-1 max-w-[12rem] text-[10px] leading-snug text-red-500/90">
                              {payment.rejection_reason?.trim()
                                ? `Motivo: ${payment.rejection_reason.trim()}`
                                : 'No verificado'}{' '}
                              ·{' '}
                              <Link to="/messages" className="font-semibold underline">
                                Mensajes
                              </Link>
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="lg:hidden">
              {loading ? (
                <div className="space-y-2">
                  <ListRowSkeleton rows={4} />
                </div>
              ) : displayPayments.length === 0 ? (
                (() => {
                  const empty = staffEmptyCopy({ search, stalePending, statusFilter });
                  return (
                    <EmptyState
                      icon={CreditCard}
                      title={empty.title}
                      description={empty.description}
                      action={
                        search || stalePending || statusFilter === 'pending' ? undefined : (
                          <Button size="sm" onClick={onOpenRegister}>
                            <Plus className="h-4 w-4" />
                            Registrar pago
                          </Button>
                        )
                      }
                    />
                  );
                })()
              ) : displayPayments.length > 12 ? (
                <Virtuoso
                  style={{ height: 'min(70vh, 48rem)' }}
                  data={displayPayments}
                  itemContent={(_index, payment) => (
                    <div className="pb-2">
                      <PaymentMobileCard
                        payment={payment}
                        isStaff
                        showActions={!showDetailRail}
                        onProofPreview={onProofPreview}
                        onApprove={onApprove}
                        onReject={onReject}
                        onOpenDetail={
                          showDetailRail ? (p) => onSelectedPaymentChange(p) : undefined
                        }
                      />
                    </div>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  {displayPayments.map((payment) => (
                    <PaymentMobileCard
                      key={payment.id}
                      payment={payment}
                      isStaff
                      showActions={!showDetailRail}
                      onProofPreview={onProofPreview}
                      onApprove={onApprove}
                      onReject={onReject}
                      onOpenDetail={showDetailRail ? (p) => onSelectedPaymentChange(p) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="text-text-muted w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-raised text-text-muted text-[10px] font-semibold sm:text-xs">
                  <tr>
                    <th className="px-3 py-2.5 lg:px-5">Usuario</th>
                    <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                    <th className="px-3 py-2.5 lg:px-5">Monto (USD)</th>
                    <th className="px-3 py-2.5 lg:px-5">Método</th>
                    <th className="px-3 py-2.5 lg:px-5">Referencia</th>
                    <th className="px-3 py-2.5 lg:px-5">Comprobante</th>
                    <th className="px-3 py-2.5 lg:px-5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-border-subtle divide-y">
                  {loading ? (
                    <>
                      <TableRowSkeleton cols={7} />
                      <TableRowSkeleton cols={7} />
                      <TableRowSkeleton cols={7} />
                      <TableRowSkeleton cols={7} />
                    </>
                  ) : displayPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-text-muted px-5 py-8 text-center text-sm">
                        {(() => {
                          const copy = staffEmptyCopy({ search, stalePending, statusFilter });
                          return search || stalePending || statusFilter
                            ? copy.title
                            : 'No hay pagos registrados';
                        })()}
                      </td>
                    </tr>
                  ) : (
                    displayPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedPayment?.id === payment.id
                            ? 'bg-brand/5 dark:bg-brand/10'
                            : 'hover:bg-surface-raised'
                        )}
                        onClick={() => onSelectedPaymentChange(payment)}
                        aria-selected={selectedPayment?.id === payment.id}
                      >
                        <td className="text-text-secondary px-3 py-2.5 font-medium lg:px-5">
                          {payment.user_name}
                        </td>
                        <td className="text-text-muted px-3 py-2.5 whitespace-nowrap lg:px-5">
                          {formatPaymentDate(payment.created_at)}
                        </td>
                        <td className="text-text px-3 py-2.5 font-semibold tabular-nums lg:px-5">
                          ${payment.amount_usd}
                        </td>
                        <td className="text-text-muted px-3 py-2.5 capitalize lg:px-5">
                          {formatPaymentMethod(payment.method)}
                        </td>
                        <td
                          className="text-text-muted max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] lg:max-w-[16rem] lg:px-5"
                          title={payment.reference}
                        >
                          {payment.reference}
                        </td>
                        <td className="px-3 py-2.5 lg:px-5" onClick={(e) => e.stopPropagation()}>
                          {payment.proof_url ? (
                            <ProofPreviewButton onClick={() => onProofPreview(payment)} />
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 lg:px-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={paymentStatusVariant(payment.status)}
                              className="px-1.5 py-0 text-[9px]"
                            >
                              {paymentStatusLabel(payment.status)}
                            </Badge>
                            {isStaffPayment && payment.status === 'pending' && (
                              <>
                                <IconButton
                                  size="sm"
                                  variant="secondary"
                                  className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                                  aria-label="Aprobar pago"
                                  title="Aprobar"
                                  onClick={() => onApprove(payment)}
                                >
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </IconButton>
                                <IconButton
                                  size="sm"
                                  variant="danger"
                                  aria-label="Rechazar pago"
                                  title="Rechazar"
                                  onClick={() => onReject(payment)}
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </IconButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          label="pagos"
        />
      </Card>
      {isStaffPayment && showDetailRail && selectedPayment ? (
        <PaymentDetailRail
          payment={selectedPayment}
          isStaff={isStaffPayment}
          onClose={() => onSelectedPaymentChange(null)}
          onApprove={onApprove}
          onReject={onReject}
          onProofPreview={onProofPreview}
        />
      ) : null}
    </div>
  );
}
