import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Mail, MapPin, Phone, RefreshCw, UsersRound } from 'lucide-react';
import { dateLocale as es } from '../lib/dateLocale';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../context/ToastContext';
import {
  BackToDashboardLink,
  Badge,
  Button,
  Card,
  EmptyState,
  FilterChips,
  Spinner,
} from '../components/ui';
import { OperateHeader, OperatePage } from '../components/operate/OperateChrome';

type LeadStatus = 'pending' | 'contacted' | 'closed';

interface DemoLead {
  id: number;
  contact_name: string;
  email: string;
  phone: string | null;
  gym_name: string;
  city: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  pending: 'Pendiente',
  contacted: 'Contactado',
  closed: 'Cerrado',
};

const STATUS_BADGES: Record<LeadStatus, 'warning' | 'accent' | 'success'> = {
  pending: 'warning',
  contacted: 'accent',
  closed: 'success',
};

export default function DemoLeads() {
  usePageTitle('Solicitudes demo');
  const { success, error } = useToast();
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await apiFetch(`/api/demo-leads${params}`);
      const data = await parseJsonResponse<DemoLead[]>(res);
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setLeads([]);
      error(toDisplayErrorMessage(err, 'No se pudieron cargar las solicitudes'));
    } finally {
      setLoading(false);
    }
  }, [error, statusFilter]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const updateStatus = async (lead: DemoLead, status: LeadStatus) => {
    if (lead.status === status) return;

    setUpdatingId(lead.id);
    try {
      const res = await apiFetch(`/api/demo-leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const updated = await parseJsonResponse<DemoLead>(res);
      setLeads((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      success(`Solicitud marcada como ${STATUS_LABELS[status].toLowerCase()}`);
    } catch (err) {
      error(toDisplayErrorMessage(err, 'No se pudo actualizar la solicitud'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <OperatePage>
      <OperateHeader
        icon={UsersRound}
        title={
          <>
            Solicitudes de <span className="text-brand">demo</span>
          </>
        }
        subtitle="Leads recibidos desde la página pública de GymApure"
        action={
          <>
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <BackToDashboardLink className="hidden sm:inline-flex" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 w-8 px-0"
              onClick={() => void loadLeads()}
              disabled={loading}
              aria-label="Actualizar solicitudes"
              title="Actualizar solicitudes"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <FilterChips
        className="w-fit max-w-full"
        value={statusFilter}
        onChange={(value) => setStatusFilter(value as LeadStatus | 'all')}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Pendientes' },
          { value: 'contacted', label: 'Contactadas' },
          { value: 'closed', label: 'Cerradas' },
        ]}
      />

      <Card padding="md" rounded="xl">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No hay solicitudes"
            description={
              statusFilter === 'all'
                ? 'Las solicitudes de demo recibidas desde la página pública aparecerán aquí.'
                : `No hay solicitudes ${STATUS_LABELS[statusFilter].toLowerCase()}s.`
            }
          />
        ) : (
          <>
            {/* Mobile: article cards */}
            <div className="divide-border-subtle divide-y lg:hidden">
              {leads.map((lead) => (
                <article key={lead.id} className="py-3 first:pt-0 last:pb-0 sm:py-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-text truncate text-sm font-semibold">
                          {lead.gym_name}
                        </h2>
                        <Badge variant={STATUS_BADGES[lead.status]}>
                          {STATUS_LABELS[lead.status]}
                        </Badge>
                      </div>
                      <p className="text-text-secondary mt-1 text-sm font-medium">
                        {lead.contact_name}
                      </p>
                      <time
                        className="text-text-muted mt-1 block text-xs"
                        dateTime={lead.created_at}
                      >
                        {format(new Date(lead.created_at), "d 'de' MMMM, yyyy · HH:mm", {
                          locale: es,
                        })}
                      </time>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {lead.status !== 'contacted' && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={updatingId === lead.id}
                          onClick={() => void updateStatus(lead, 'contacted')}
                        >
                          Marcar contactada
                        </Button>
                      )}
                      {lead.status !== 'closed' && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={updatingId === lead.id}
                          onClick={() => void updateStatus(lead, 'closed')}
                        >
                          Cerrar solicitud
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-text-secondary mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    <a
                      className="hover:text-brand inline-flex items-center gap-1.5"
                      href={`mailto:${lead.email}`}
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <a
                        className="hover:text-brand inline-flex items-center gap-1.5"
                        href={`tel:${lead.phone}`}
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.city && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {lead.city}
                      </span>
                    )}
                  </div>

                  {lead.message && (
                    <p className="bg-surface-raised text-text-secondary mt-3 rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap">
                      {lead.message}
                    </p>
                  )}
                </article>
              ))}
            </div>

            {/* Desktop: dense table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-border bg-surface-raised/95 text-text-muted text-small sticky top-0 z-[1] border-b font-semibold tracking-wide uppercase backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2.5">Gym</th>
                    <th className="px-3 py-2.5">Contacto</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-border-subtle divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-surface-raised/80">
                      <td className="max-w-[14rem] px-3 py-3">
                        <p className="text-text truncate font-semibold">{lead.gym_name}</p>
                        {lead.city ? (
                          <p className="text-text-muted text-small truncate">{lead.city}</p>
                        ) : null}
                        {lead.message ? (
                          <p className="text-text-muted text-small mt-1 line-clamp-1">
                            {lead.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="max-w-[16rem] px-3 py-3">
                        <p className="text-text truncate font-medium">{lead.contact_name}</p>
                        <a
                          href={`mailto:${lead.email}`}
                          className="hover:text-brand text-text-muted text-small mt-0.5 block truncate"
                        >
                          {lead.email}
                        </a>
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="hover:text-brand text-text-muted text-small block truncate"
                          >
                            {lead.phone}
                          </a>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={STATUS_BADGES[lead.status]}>
                          {STATUS_LABELS[lead.status]}
                        </Badge>
                      </td>
                      <td className="text-text-muted px-3 py-3 text-xs whitespace-nowrap tabular-nums">
                        <time dateTime={lead.created_at}>
                          {format(new Date(lead.created_at), 'dd MMM yyyy · HH:mm', {
                            locale: es,
                          })}
                        </time>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {lead.status !== 'contacted' && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={updatingId === lead.id}
                              onClick={() => void updateStatus(lead, 'contacted')}
                            >
                              Contactada
                            </Button>
                          )}
                          {lead.status !== 'closed' && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={updatingId === lead.id}
                              onClick={() => void updateStatus(lead, 'closed')}
                            >
                              Cerrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </OperatePage>
  );
}
