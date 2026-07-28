import { Virtuoso } from 'react-virtuoso';
import {
  Plus,
  Wrench,
  AlertTriangle,
  MapPin,
  Settings2,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
import { downloadEquipmentCsv, groupEquipmentByZone } from '../../lib/equipment/inventoryHelpers';
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
} from '../../lib/equipment/constants';
import {
  Button,
  Card,
  PageHeader,
  EmptyState,
  BackToDashboardLink,
  FilterChips,
  SegmentedControl,
  SearchInput,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { EquipmentListCard } from './EquipmentListCard';
import type { EquipmentItem, LayoutView, Zone } from './types';

type ZoneGroup = ReturnType<typeof groupEquipmentByZone>[number];

export interface EquipmentInventorySectionProps {
  isAdmin: boolean;
  allItems: EquipmentItem[];
  items: EquipmentItem[];
  zones: Zone[];
  zoneGroups: ZoneGroup[];
  statusCounts: Record<string, number>;
  inspectionDueCount: number;
  attentionCount: number;
  activeFilterCount: number;
  adminSummaryFilter: string;
  onAdminSummaryFilter: (value: string) => void;
  showAttentionAlert: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  zoneFilter: string;
  onZoneFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  inspectionDueOnly: boolean;
  onInspectionDueOnlyChange: (value: boolean) => void;
  staffQuickFilter: 'all' | 'attention' | 'inspection_due';
  onStaffQuickFilterChange: (value: 'all' | 'attention' | 'inspection_due') => void;
  layoutView: LayoutView;
  onLayoutViewChange: (value: LayoutView) => void;
  onClearFilters: () => void;
  bootstrapError: boolean;
  onRetry: () => void;
  onOpenDetail: (id: number) => void;
  onOpenConfig: () => void;
  onOpenAdd: () => void;
}

export function EquipmentInventorySection({
  isAdmin,
  allItems,
  items,
  zones,
  zoneGroups,
  statusCounts,
  inspectionDueCount,
  attentionCount,
  activeFilterCount,
  adminSummaryFilter,
  onAdminSummaryFilter,
  showAttentionAlert,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  zoneFilter,
  onZoneFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  filtersOpen,
  onFiltersOpenChange,
  inspectionDueOnly,
  onInspectionDueOnlyChange,
  staffQuickFilter,
  onStaffQuickFilterChange,
  layoutView,
  onLayoutViewChange,
  onClearFilters,
  bootstrapError,
  onRetry,
  onOpenDetail,
  onOpenConfig,
  onOpenAdd,
}: EquipmentInventorySectionProps) {
  return (
    <>
      <PageHeader
        compact
        title={
          <>
            Equipamiento <span className="text-brand">del gym</span>
          </>
        }
        subtitle={
          isAdmin
            ? 'Inventario y mantenimiento'
            : allItems.length === 0
              ? undefined
              : 'Estado e incidencias'
        }
        action={
          isAdmin ? (
            <div className="flex shrink-0 items-center gap-1">
              <BackToDashboardLink iconOnly className="lg:hidden" />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={() => onOpenConfig()}
                aria-label="Zonas y proveedores"
                title="Zonas y proveedores"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button onClick={() => onOpenAdd()} className="h-9 gap-1.5 px-2.5 sm:px-4">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Añadir equipo</span>
                <span className="sr-only sm:hidden">Añadir equipo</span>
              </Button>
            </div>
          ) : (
            <BackToDashboardLink iconOnly className="lg:hidden" />
          )
        }
      />

      <div className="flex flex-col gap-3">
        {isAdmin ? (
          <FilterChips
            className="w-fit max-w-full"
            value={adminSummaryFilter}
            onChange={onAdminSummaryFilter}
            options={[
              { value: 'all', label: 'Todos', count: allItems.length },
              ...EQUIPMENT_STATUSES.filter((s) => (statusCounts[s] ?? 0) > 0).map((s) => ({
                value: s,
                label: EQUIPMENT_STATUS_LABELS[s],
                count: statusCounts[s],
              })),
              ...(inspectionDueCount > 0
                ? [
                    {
                      value: '__inspection__',
                      label: 'Revisión',
                      count: inspectionDueCount,
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <FilterChips
            className="w-fit max-w-full"
            value={staffQuickFilter}
            onChange={(v) => onStaffQuickFilterChange(v as typeof staffQuickFilter)}
            options={[
              { value: 'all', label: 'Todos' },
              {
                value: 'attention',
                label: 'Atención',
                count: attentionCount,
              },
              {
                value: 'inspection_due',
                label: 'Revisión',
                count: inspectionDueCount,
              },
            ]}
          />
        )}

        {showAttentionAlert && (
          <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/5 px-3 py-1.5">
            <p className="flex min-w-0 items-center gap-2 truncate text-xs font-medium text-orange-800 dark:text-orange-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {attentionCount} equipo{attentionCount !== 1 ? 's' : ''} requieren atención
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-orange-700 dark:text-orange-300"
              onClick={() => {
                onFiltersOpenChange(true);
                if ((statusCounts.maintenance ?? 0) > 0) {
                  onStatusFilterChange('maintenance');
                } else if ((statusCounts.out_of_service ?? 0) > 0) {
                  onStatusFilterChange('out_of_service');
                } else {
                  onStatusFilterChange('limited');
                }
                onInspectionDueOnlyChange(false);
              }}
            >
              Ver
            </Button>
          </div>
        )}

        {/* Toolbar: stack on xs, one row from sm+ */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SearchInput
            containerClassName="min-w-0 w-full flex-1"
            placeholder="Buscar equipo…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar equipo, marca o modelo"
          />
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:h-11 sm:justify-end">
            {allItems.length > 0 ? (
              <SegmentedControl
                variant="compact"
                value={layoutView}
                onChange={(v) => onLayoutViewChange(v)}
                className="w-fit max-w-full"
                options={[
                  { value: 'flat', label: 'Lista' },
                  { value: 'zones', label: 'Zonas' },
                ]}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 gap-1.5 px-2.5',
                filtersOpen && 'bg-zinc-100 dark:bg-zinc-800',
                activeFilterCount > 0 && 'text-brand'
              )}
              onClick={() => onFiltersOpenChange(!filtersOpen)}
              aria-expanded={filtersOpen}
              aria-label="Filtros"
              title="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden md:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="bg-brand/15 text-brand rounded-md px-1.5 text-[10px] font-bold tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {isAdmin && items.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 px-0"
                onClick={() => downloadEquipmentCsv(items)}
                aria-label="Exportar CSV"
                title="Exportar CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <Card
            padding="sm"
            rounded="xl"
            className="space-y-3 border-zinc-200/70 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/50"
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {isAdmin && (
                <FilterChips
                  value={statusFilter}
                  onChange={(value) => {
                    onInspectionDueOnlyChange(false);
                    onStatusFilterChange(value);
                  }}
                  options={[
                    { value: 'all', label: 'Estados' },
                    ...EQUIPMENT_STATUSES.map((s) => ({
                      value: s,
                      label: EQUIPMENT_STATUS_LABELS[s],
                      count: statusCounts[s],
                    })),
                  ]}
                />
              )}
              <FilterChips
                value={zoneFilter}
                onChange={onZoneFilterChange}
                options={[
                  { value: 'all', label: 'Zonas' },
                  ...zones.map((z) => ({ value: String(z.id), label: z.name })),
                ]}
              />
              <FilterChips
                value={categoryFilter}
                onChange={onCategoryFilterChange}
                options={[
                  { value: 'all', label: 'Categorías' },
                  ...EQUIPMENT_CATEGORIES.map((c) => ({
                    value: c,
                    label: EQUIPMENT_CATEGORY_LABELS[c],
                  })),
                ]}
              />
              <FilterChips
                value={inspectionDueOnly ? 'due' : 'all'}
                onChange={(v) => onInspectionDueOnlyChange(v === 'due')}
                options={[
                  { value: 'all', label: 'Revisión' },
                  {
                    value: 'due',
                    label: 'Pendiente',
                    count: inspectionDueCount,
                  },
                ]}
              />
            </div>
            {activeFilterCount > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
                Limpiar filtros
              </Button>
            )}
          </Card>
        )}

        {bootstrapError ? (
          <EmptyState
            compact
            icon={AlertTriangle}
            title="No se pudo cargar el equipamiento"
            description="Revisa tu conexión e inténtalo de nuevo."
            className="mx-auto max-w-md"
            action={
              <Button size="sm" onClick={() => onRetry()}>
                Reintentar
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={Wrench}
            className="mx-auto max-w-md"
            title={allItems.length === 0 ? 'Sin equipamiento registrado' : 'Sin resultados'}
            description={
              allItems.length === 0
                ? isAdmin
                  ? 'Añade el primer equipo desde la biblioteca del sistema.'
                  : 'Cuando el admin registre equipos, aparecerán aquí.'
                : 'Prueba otra búsqueda o ajusta los filtros.'
            }
            action={
              allItems.length === 0 && isAdmin ? (
                <Button size="sm" onClick={() => onOpenAdd()}>
                  Añadir equipo
                </Button>
              ) : activeFilterCount > 0 || staffQuickFilter !== 'all' ? (
                <Button size="sm" variant="secondary" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : layoutView === 'zones' ? (
          <div className="space-y-4 sm:space-y-5">
            {zoneGroups.map((group) => (
              <section key={group.zoneId ?? 'none'}>
                <div className="mb-2 flex items-center gap-2 px-0.5">
                  <MapPin className="text-brand h-4 w-4 shrink-0" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {group.zoneName}
                  </h3>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 tabular-nums dark:bg-zinc-800">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <EquipmentListCard key={item.id} item={item} onOpen={onOpenDetail} hideZone />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : items.length >= 48 ? (
          <Virtuoso
            style={{ height: 'min(70vh, 900px)' }}
            data={items}
            className="rounded-xl"
            itemContent={(_index, item) => (
              <div className="pb-2 sm:pr-1">
                <EquipmentListCard item={item} onOpen={onOpenDetail} />
              </div>
            )}
          />
        ) : (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {items.map((item) => (
              <EquipmentListCard key={item.id} item={item} onOpen={onOpenDetail} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
