import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Wrench,
  AlertTriangle,
  Camera,
  MapPin,
  Clock,
  Settings2,
  SlidersHorizontal,
  ChevronLeft,
  Pencil,
  Trash2,
  Hammer,
  Archive,
  Download,
  MoreHorizontal,
} from 'lucide-react';
import { cn, formatMoney } from '../lib/utils';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { groupEquipmentByZone, downloadEquipmentCsv } from '../lib/equipment/inventoryHelpers';
import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse, resolveEquipmentPhotoUrl } from '../lib/api';
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_EVENT_LABELS,
  EQUIPMENT_STATUS_BADGE,
  equipmentDisplayName,
  type EquipmentStatus,
  type EquipmentCategory,
} from '../lib/equipment/constants';
import {
  Button,
  Card,
  Input,
  Label,
  Modal,
  PageHeader,
  Spinner,
  Badge,
  EmptyState,
  BackToDashboardLink,
  FilterChips,
  SegmentedControl,
  Textarea,
  Select,
  SearchInput,
  AnchoredMenu,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

interface Zone {
  id: number;
  name: string;
  sort_order: number;
}

interface CatalogItem {
  id: number;
  name: string;
  category: EquipmentCategory;
  description?: string | null;
  typical_brands?: string | null;
  is_system: boolean;
}

interface Vendor {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface EquipmentItem {
  id: number;
  catalog_id?: number | null;
  catalog_name?: string | null;
  catalog_category?: EquipmentCategory | null;
  custom_name?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  status: EquipmentStatus;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  quantity: number;
  notes?: string | null;
  photo_url?: string | null;
  next_inspection_at?: string | null;
  warranty_until?: string | null;
}

interface MaintenanceEvent {
  id: number;
  event_type: string;
  description: string;
  previous_status?: string | null;
  new_status?: string | null;
  performed_at: string;
  created_by_name?: string | null;
  vendor_name?: string | null;
  cost_usd?: number | null;
}

type AddStep = 'pick' | 'details';
type ConfigTab = 'zones' | 'vendors';

const STATUS_BORDER_STYLES: Record<EquipmentStatus, string> = {
  operational: 'border-l-emerald-500',
  limited: 'border-l-orange-500',
  maintenance: 'border-l-brand',
  out_of_service: 'border-l-red-500',
};

const STATUS_SHORT_LABELS: Record<EquipmentStatus, string> = {
  operational: 'OK',
  limited: 'Limit.',
  maintenance: 'Mant.',
  out_of_service: 'Fuera',
};

const emptyEquipmentForm = {
  catalog_id: '',
  custom_name: '',
  zone_id: '',
  status: 'operational' as EquipmentStatus,
  brand: '',
  model: '',
  serial_number: '',
  quantity: '1',
  notes: '',
  next_inspection_at: '',
};

const emptyRepairForm = {
  description: '',
  vendor_id: '',
  cost_usd: '',
  performed_at: '',
  new_status: '' as EquipmentStatus | '',
};

function isInspectionDue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  due.setHours(23, 59, 59, 999);
  return due.getTime() <= Date.now();
}

type LayoutView = 'flat' | 'zones';

function EquipmentListCard({
  item,
  onOpen,
  hideZone = false,
}: {
  item: EquipmentItem;
  onOpen: (id: number) => void;
  hideZone?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-l-4 bg-white p-3 text-left transition hover:border-zinc-300 dark:bg-zinc-900 dark:hover:border-zinc-600',
        STATUS_BORDER_STYLES[item.status],
        'border-zinc-200 dark:border-zinc-800'
      )}
    >
      {item.photo_url ? (
        <img
          src={resolveEquipmentPhotoUrl(item.photo_url)}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Wrench className="h-5 w-5 text-zinc-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {equipmentDisplayName(item)}
        </p>
        {!hideZone && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
            <MapPin className="h-3 w-3 shrink-0" />
            {item.zone_name ?? 'Sin zona'}
          </p>
        )}
        {isInspectionDue(item.next_inspection_at) && (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
            <Clock className="h-3 w-3" />
            Revisión pendiente
          </p>
        )}
      </div>
      <Badge variant={EQUIPMENT_STATUS_BADGE[item.status]} className="shrink-0 text-[10px]">
        <span className="sm:hidden">{STATUS_SHORT_LABELS[item.status]}</span>
        <span className="hidden sm:inline">{EQUIPMENT_STATUS_LABELS[item.status]}</span>
      </Badge>
    </button>
  );
}

export default function Equipment() {
  usePageTitle('Equipamiento');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const [allItems, setAllItems] = useState<EquipmentItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inspectionDueOnly, setInspectionDueOnly] = useState(false);
  const [staffQuickFilter, setStaffQuickFilter] = useState<'all' | 'attention' | 'inspection_due'>(
    'all'
  );
  const [layoutView, setLayoutView] = useState<LayoutView>('flat');

  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>('pick');
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<ConfigTab>('zones');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null);
  const [equipmentForm, setEquipmentForm] = useState(emptyEquipmentForm);
  const [formError, setFormError] = useState('');

  const detailId = searchParams.get('detail');
  const [detail, setDetail] = useState<EquipmentItem | null>(null);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEquipmentForm);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [repairOpen, setRepairOpen] = useState(false);
  const [repairForm, setRepairForm] = useState(emptyRepairForm);
  const [repairError, setRepairError] = useState('');
  const [repairSaving, setRepairSaving] = useState(false);

  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [retireError, setRetireError] = useState('');
  const [retiring, setRetiring] = useState(false);

  const detailMoreRef = useRef<HTMLButtonElement>(null);
  const [detailMoreOpen, setDetailMoreOpen] = useState(false);

  const [zoneName, setZoneName] = useState('');
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of EQUIPMENT_STATUSES) counts[s] = 0;
    for (const item of allItems) counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, [allItems]);

  const inspectionDueCount = useMemo(
    () => allItems.filter((item) => isInspectionDue(item.next_inspection_at)).length,
    [allItems]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n++;
    if (zoneFilter !== 'all') n++;
    if (categoryFilter !== 'all') n++;
    if (inspectionDueOnly) n++;
    if (!isAdmin && staffQuickFilter !== 'all') n++;
    return n;
  }, [statusFilter, zoneFilter, categoryFilter, inspectionDueOnly, isAdmin, staffQuickFilter]);

  const items = useMemo(() => {
    return allItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (zoneFilter !== 'all' && String(item.zone_id ?? '') !== zoneFilter) return false;
      if (categoryFilter !== 'all' && item.catalog_category !== categoryFilter) return false;
      if (inspectionDueOnly && !isInspectionDue(item.next_inspection_at)) return false;
      if (!isAdmin) {
        if (staffQuickFilter === 'attention' && item.status === 'operational') return false;
        if (staffQuickFilter === 'inspection_due' && !isInspectionDue(item.next_inspection_at)) {
          return false;
        }
      }
      return true;
    });
  }, [
    allItems,
    statusFilter,
    zoneFilter,
    categoryFilter,
    inspectionDueOnly,
    isAdmin,
    staffQuickFilter,
  ]);

  const zoneGroups = useMemo(() => groupEquipmentByZone(items, zones), [items, zones]);

  const loadInventory = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    const res = await apiFetch(`/api/equipment?${params.toString()}`);
    const data = await parseJsonResponse<EquipmentItem[]>(res);
    setAllItems(Array.isArray(data) ? data : []);
  }, [debouncedSearch]);

  const loadMeta = useCallback(async () => {
    const [zonesRes, catalogRes, vendorsRes] = await Promise.all([
      apiFetch('/api/equipment/zones'),
      apiFetch('/api/equipment/catalog'),
      isAdmin ? apiFetch('/api/equipment/vendors') : Promise.resolve(null),
    ]);
    const zonesData = await parseJsonResponse<Zone[]>(zonesRes);
    setZones(Array.isArray(zonesData) ? zonesData : []);
    const catalogData = await parseJsonResponse<CatalogItem[]>(catalogRes);
    setCatalog(Array.isArray(catalogData) ? catalogData : []);
    if (vendorsRes) {
      const vendorsData = await parseJsonResponse<Vendor[]>(vendorsRes);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
    }
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([loadMeta(), loadInventory()])
      .catch(() => {
        if (!cancelled) {
          setAllItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadInventory();
  }, [debouncedSearch, loadInventory, loading]);

  useEffect(() => {
    if (!addPhotoFile) {
      setAddPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(addPhotoFile);
    setAddPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [addPhotoFile]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/equipment/${id}`);
      const data = await parseJsonResponse<{
        equipment: EquipmentItem;
        events: MaintenanceEvent[];
      }>(res);
      setDetail(data.equipment);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setDetail(null);
      setEvents([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailId) {
      void loadDetail(Number(detailId));
    } else {
      setDetail(null);
      setEvents([]);
    }
  }, [detailId, loadDetail]);

  const openDetail = (id: number) => {
    setSearchParams({ detail: String(id) });
  };

  const closeDetail = () => {
    setDetailMoreOpen(false);
    setSearchParams({});
  };

  const handleCreateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      catalog_id: selectedCatalogId,
      custom_name: equipmentForm.custom_name.trim() || null,
      zone_id: equipmentForm.zone_id ? Number(equipmentForm.zone_id) : null,
      status: equipmentForm.status,
      brand: equipmentForm.brand.trim() || null,
      model: equipmentForm.model.trim() || null,
      serial_number: equipmentForm.serial_number.trim() || null,
      quantity: Number(equipmentForm.quantity) || 1,
      notes: equipmentForm.notes.trim() || null,
      next_inspection_at: equipmentForm.next_inspection_at || null,
    };
    if (!payload.catalog_id && !payload.custom_name) {
      setFormError('Selecciona un tipo del catálogo o escribe un nombre personalizado');
      return;
    }
    setAddSaving(true);
    try {
      const res = await apiFetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await parseJsonResponse<EquipmentItem>(res);
      if (addPhotoFile) {
        const formData = new FormData();
        formData.append('photo', addPhotoFile);
        await apiFetch(`/api/equipment/${created.id}/photo`, {
          method: 'POST',
          body: formData,
        });
      }
      closeAddModal();
      setSelectedCatalogId(null);
      setEquipmentForm(emptyEquipmentForm);
      setAddPhotoFile(null);
      await loadInventory();
      openDetail(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear el equipo');
    } finally {
      setAddSaving(false);
    }
  };

  const handleReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setReportError('');
    try {
      const res = await apiFetch(`/api/equipment/${detail.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: reportText.trim(), event_type: 'report' }),
      });
      await parseJsonResponse(res);
      setReportOpen(false);
      setReportText('');
      await Promise.all([loadInventory(), loadDetail(detail.id)]);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'No se pudo enviar el reporte');
    }
  };

  const handleStatusChange = async (status: EquipmentStatus) => {
    if (!detail || !isAdmin) return;
    const res = await apiFetch(`/api/equipment/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await parseJsonResponse(res);
    await Promise.all([loadInventory(), loadDetail(detail.id)]);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!detail || !isAdmin) return;
    const formData = new FormData();
    formData.append('photo', file);
    const res = await apiFetch(`/api/equipment/${detail.id}/photo`, {
      method: 'POST',
      body: formData,
    });
    await parseJsonResponse(res);
    await loadDetail(detail.id);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditForm({
      catalog_id: detail.catalog_id ? String(detail.catalog_id) : '',
      custom_name: detail.custom_name ?? detail.catalog_name ?? '',
      zone_id: detail.zone_id ? String(detail.zone_id) : '',
      status: detail.status,
      brand: detail.brand ?? '',
      model: detail.model ?? '',
      serial_number: detail.serial_number ?? '',
      quantity: String(detail.quantity),
      notes: detail.notes ?? '',
      next_inspection_at: detail.next_inspection_at?.slice(0, 10) ?? '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const handleUpdateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setEditError('');
    setEditSaving(true);
    const payload = {
      custom_name: editForm.custom_name.trim() || null,
      zone_id: editForm.zone_id ? Number(editForm.zone_id) : null,
      status: editForm.status,
      brand: editForm.brand.trim() || null,
      model: editForm.model.trim() || null,
      serial_number: editForm.serial_number.trim() || null,
      quantity: Number(editForm.quantity) || 1,
      notes: editForm.notes.trim() || null,
      next_inspection_at: editForm.next_inspection_at || null,
    };
    if (!detail.catalog_id && !payload.custom_name) {
      setEditError('El nombre del equipo es obligatorio');
      setEditSaving(false);
      return;
    }
    try {
      const res = await apiFetch(`/api/equipment/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseJsonResponse(res);
      setEditOpen(false);
      await Promise.all([loadInventory(), loadDetail(detail.id)]);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo actualizar el equipo');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!detail) return;
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/equipment/${detail.id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      setDeleteOpen(false);
      closeDetail();
      await loadInventory();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el equipo');
    } finally {
      setDeleting(false);
    }
  };

  const openRepair = () => {
    if (!detail) return;
    const suggestOperational =
      detail.status === 'maintenance' ||
      detail.status === 'out_of_service' ||
      detail.status === 'limited';
    setRepairForm({
      description: '',
      vendor_id: '',
      cost_usd: '',
      performed_at: new Date().toISOString().slice(0, 10),
      new_status: suggestOperational ? 'operational' : '',
    });
    setRepairError('');
    setRepairOpen(true);
  };

  const handleRepair = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setRepairError('');
    setRepairSaving(true);
    const payload: Record<string, unknown> = {
      event_type: 'repair',
      description: repairForm.description.trim(),
    };
    if (repairForm.vendor_id) payload.vendor_id = Number(repairForm.vendor_id);
    if (repairForm.cost_usd.trim()) payload.cost_usd = Number(repairForm.cost_usd);
    if (repairForm.performed_at) payload.performed_at = repairForm.performed_at;
    if (repairForm.new_status) payload.new_status = repairForm.new_status;
    try {
      const res = await apiFetch(`/api/equipment/${detail.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseJsonResponse(res);
      setRepairOpen(false);
      setRepairForm(emptyRepairForm);
      await Promise.all([loadInventory(), loadDetail(detail.id)]);
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : 'No se pudo registrar la reparación');
    } finally {
      setRepairSaving(false);
    }
  };

  const handleRetire = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setRetireError('');
    setRetiring(true);
    try {
      const res = await apiFetch(`/api/equipment/${detail.id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: retireReason.trim() || null }),
      });
      await parseJsonResponse(res);
      setRetireOpen(false);
      setRetireReason('');
      await Promise.all([loadInventory(), loadDetail(detail.id)]);
    } catch (err) {
      setRetireError(err instanceof Error ? err.message : 'No se pudo retirar el equipo');
    } finally {
      setRetiring(false);
    }
  };

  const handleAddZone = async (e: FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;
    await apiFetch('/api/equipment/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: zoneName.trim() }),
    });
    setZoneName('');
    await loadMeta();
  };

  const handleAddVendor = async (e: FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) return;
    await apiFetch('/api/equipment/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: vendorForm.name.trim(),
        contact_name: vendorForm.contact_name.trim() || null,
        phone: vendorForm.phone.trim() || null,
        email: vendorForm.email.trim() || null,
      }),
    });
    setVendorForm({ name: '', contact_name: '', phone: '', email: '' });
    await loadMeta();
  };

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalog.filter((c) => {
      if (catalogCategoryFilter !== 'all' && c.category !== catalogCategoryFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.typical_brands?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [catalog, catalogSearch, catalogCategoryFilter]);

  const openAddFromCatalog = (item?: CatalogItem) => {
    setAddPhotoFile(null);
    if (item) {
      setSelectedCatalogId(item.id);
      setEquipmentForm({
        ...emptyEquipmentForm,
        custom_name: item.name,
        brand: item.typical_brands?.split(' ')[0] ?? '',
      });
      setCatalogSearch(item.name);
      setAddStep('details');
    } else {
      setSelectedCatalogId(null);
      setEquipmentForm(emptyEquipmentForm);
      setCatalogSearch('');
      setCatalogCategoryFilter('all');
      setAddStep('pick');
    }
    setAddOpen(true);
  };

  const closeAddModal = () => {
    setAddOpen(false);
    setAddStep('pick');
    setFormError('');
    setAddPhotoFile(null);
    setAddSaving(false);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setZoneFilter('all');
    setCategoryFilter('all');
    setInspectionDueOnly(false);
    setStaffQuickFilter('all');
  };

  const attentionCount = useMemo(
    () =>
      (statusCounts.limited ?? 0) +
      (statusCounts.maintenance ?? 0) +
      (statusCounts.out_of_service ?? 0),
    [statusCounts]
  );

  const adminSummaryFilter = inspectionDueOnly
    ? '__inspection__'
    : statusFilter !== 'all'
      ? statusFilter
      : 'all';

  const handleAdminSummaryFilter = (value: string) => {
    if (value === '__inspection__') {
      setInspectionDueOnly(true);
      setStatusFilter('all');
      return;
    }
    setInspectionDueOnly(false);
    setStatusFilter(value);
  };

  const showAttentionAlert =
    isAdmin && attentionCount > 0 && statusFilter === 'all' && !inspectionDueOnly;

  if (loading) {
    return (
      <div className="page-state-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        compact
        showTitleOnMobile
        title={
          <>
            Equipamiento <span className="text-brand">del gym</span>
          </>
        }
        subtitle={
          isAdmin ? 'Inventario y mantenimiento' : 'Consulta el estado y reporta incidencias'
        }
        action={
          isAdmin ? (
            <div className="flex items-center gap-1.5">
              <BackToDashboardLink iconOnly className="lg:hidden" />
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={() => setConfigOpen(true)}
                aria-label="Zonas y proveedores"
                title="Zonas y proveedores"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button onClick={() => openAddFromCatalog()} className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Añadir equipo</span>
                <span className="sm:hidden">Añadir</span>
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
            value={adminSummaryFilter}
            onChange={handleAdminSummaryFilter}
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
                      label: 'Revisión pendiente',
                      count: inspectionDueCount,
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <FilterChips
            value={staffQuickFilter}
            onChange={(v) => setStaffQuickFilter(v as typeof staffQuickFilter)}
            options={[
              { value: 'all', label: 'Todos' },
              {
                value: 'attention',
                label: 'Requieren atención',
                count: attentionCount,
              },
              {
                value: 'inspection_due',
                label: 'Revisión pendiente',
                count: inspectionDueCount,
              },
            ]}
          />
        )}

        {showAttentionAlert && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/25 bg-orange-500/5 px-3 py-2">
            <p className="flex items-center gap-2 text-xs font-medium text-orange-800 dark:text-orange-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {attentionCount} equipo{attentionCount !== 1 ? 's' : ''} requieren atención
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-orange-700 dark:text-orange-300"
              onClick={() => {
                setFiltersOpen(true);
                if ((statusCounts.maintenance ?? 0) > 0) {
                  setStatusFilter('maintenance');
                } else if ((statusCounts.out_of_service ?? 0) > 0) {
                  setStatusFilter('out_of_service');
                } else {
                  setStatusFilter('limited');
                }
                setInspectionDueOnly(false);
              }}
            >
              Ver
            </Button>
          </div>
        )}

        <Card padding="sm" rounded="xl" className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <SearchInput
              className="min-w-0 flex-1"
              placeholder="Buscar equipo, marca o modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                variant="compact"
                value={layoutView}
                onChange={(v) => setLayoutView(v)}
                className="shrink-0"
                options={[
                  { value: 'flat', label: 'Lista' },
                  { value: 'zones', label: 'Por zona' },
                ]}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
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
        </Card>

        {filtersOpen && (
          <Card padding="sm" rounded="xl" className="space-y-3">
            {isAdmin && (
              <FilterChips
                value={statusFilter}
                onChange={(value) => {
                  setInspectionDueOnly(false);
                  setStatusFilter(value);
                }}
                options={[
                  { value: 'all', label: 'Todos los estados' },
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
              onChange={setZoneFilter}
              options={[
                { value: 'all', label: 'Todas las zonas' },
                ...zones.map((z) => ({ value: String(z.id), label: z.name })),
              ]}
            />
            <FilterChips
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...EQUIPMENT_CATEGORIES.map((c) => ({
                  value: c,
                  label: EQUIPMENT_CATEGORY_LABELS[c],
                })),
              ]}
            />
            <FilterChips
              value={inspectionDueOnly ? 'due' : 'all'}
              onChange={(v) => setInspectionDueOnly(v === 'due')}
              options={[
                { value: 'all', label: 'Cualquier revisión' },
                {
                  value: 'due',
                  label: 'Revisión pendiente',
                  count: inspectionDueCount,
                },
              ]}
            />
            {activeFilterCount > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={allItems.length === 0 ? 'Sin equipamiento registrado' : 'Sin resultados'}
            description={
              allItems.length === 0
                ? isAdmin
                  ? 'Añade el primer equipo desde la biblioteca del sistema.'
                  : 'Aún no hay equipos en el inventario.'
                : 'Prueba otra búsqueda o ajusta los filtros.'
            }
            action={
              allItems.length === 0 && isAdmin ? (
                <Button onClick={() => openAddFromCatalog()}>Añadir equipo</Button>
              ) : activeFilterCount > 0 ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : layoutView === 'zones' ? (
          <div className="space-y-5">
            {zoneGroups.map((group) => (
              <section key={group.zoneId ?? 'none'}>
                <div className="mb-2 flex items-center gap-2 px-0.5">
                  <MapPin className="text-brand h-4 w-4 shrink-0" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {group.zoneName}
                  </h3>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 tabular-nums dark:bg-zinc-800">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <EquipmentListCard key={item.id} item={item} onOpen={openDetail} hideZone />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <EquipmentListCard key={item.id} item={item} onOpen={openDetail} />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configuración de equipamiento"
        maxWidth="lg"
        initialFocus="dialog"
      >
        <SegmentedControl
          value={configTab}
          onChange={(v) => setConfigTab(v)}
          className="mb-4 w-full"
          fullWidth
          options={[
            { value: 'zones', label: 'Zonas' },
            { value: 'vendors', label: 'Proveedores' },
          ]}
        />
        {configTab === 'zones' ? (
          <>
            <form onSubmit={handleAddZone} className="mb-4 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Nombre de zona (ej. Cardio)"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
              <Button type="submit">Añadir zona</Button>
            </form>
            <ul className="space-y-2">
              {zones.map((zone) => (
                <li
                  key={zone.id}
                  className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                >
                  <span className="font-medium">{zone.name}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <form onSubmit={handleAddVendor} className="mb-4 grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Nombre del proveedor"
                value={vendorForm.name}
                onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Contacto"
                value={vendorForm.contact_name}
                onChange={(e) => setVendorForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
              <Input
                placeholder="Teléfono"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                placeholder="Email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Button type="submit" className="sm:col-span-2">
                Añadir proveedor
              </Button>
            </form>
            <ul className="space-y-2">
              {vendors.map((vendor) => (
                <li
                  key={vendor.id}
                  className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                >
                  <p className="font-medium">{vendor.name}</p>
                  {(vendor.contact_name || vendor.phone) && (
                    <p className="text-xs text-zinc-500">
                      {[vendor.contact_name, vendor.phone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={closeAddModal}
        title={addStep === 'pick' ? 'Elegir tipo de máquina' : 'Registrar en el gym'}
        maxWidth={addStep === 'pick' ? 'lg' : 'md'}
        initialFocus={addStep === 'pick' ? 'input' : 'dialog'}
      >
        {addStep === 'pick' ? (
          <div className="space-y-4">
            <SearchInput
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Smith, prensa, cinta..."
            />
            <FilterChips
              value={catalogCategoryFilter}
              onChange={setCatalogCategoryFilter}
              options={[
                { value: 'all', label: 'Todas' },
                ...EQUIPMENT_CATEGORIES.map((c) => ({
                  value: c,
                  label: EQUIPMENT_CATEGORY_LABELS[c],
                })),
              ]}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/80">
              {filteredCatalog.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {catalog.length === 0
                    ? 'Biblioteca vacía. Aplica las migraciones de base de datos.'
                    : 'No hay resultados para esta búsqueda.'}
                </p>
              ) : (
                filteredCatalog.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openAddFromCatalog(item)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {EQUIPMENT_CATEGORY_LABELS[item.category]}
                    </span>
                  </button>
                ))
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSelectedCatalogId(null);
                setEquipmentForm(emptyEquipmentForm);
                setAddStep('details');
              }}
            >
              Equipo personalizado (no está en la biblioteca)
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateEquipment} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1"
              onClick={() => setAddStep('pick')}
            >
              <ChevronLeft className="h-4 w-4" />
              Cambiar tipo
            </Button>
            {selectedCatalogId && (
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Tipo:{' '}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {catalog.find((c) => c.id === selectedCatalogId)?.name ??
                    equipmentForm.custom_name}
                </span>
              </p>
            )}
            <div>
              <Label>
                {selectedCatalogId ? 'Nombre en el gym (opcional)' : 'Nombre del equipo'}
              </Label>
              <Input
                value={equipmentForm.custom_name}
                onChange={(e) => setEquipmentForm((f) => ({ ...f, custom_name: e.target.value }))}
                placeholder="Ej. Prensa piernas #2"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Zona</Label>
                <Select
                  value={equipmentForm.zone_id}
                  onChange={(e) => setEquipmentForm((f) => ({ ...f, zone_id: e.target.value }))}
                >
                  <option value="">Sin zona</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Estado inicial</Label>
                <Select
                  value={equipmentForm.status}
                  onChange={(e) =>
                    setEquipmentForm((f) => ({
                      ...f,
                      status: e.target.value as EquipmentStatus,
                    }))
                  }
                >
                  {EQUIPMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {EQUIPMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Marca</Label>
                <Input
                  value={equipmentForm.brand}
                  onChange={(e) => setEquipmentForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input
                  value={equipmentForm.model}
                  onChange={(e) => setEquipmentForm((f) => ({ ...f, model: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Próxima inspección</Label>
              <Input
                type="date"
                value={equipmentForm.next_inspection_at}
                onChange={(e) =>
                  setEquipmentForm((f) => ({ ...f, next_inspection_at: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Foto (opcional)</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {addPhotoPreview ? (
                  <img
                    src={addPhotoPreview}
                    alt=""
                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800">
                    <Camera className="h-6 w-6 text-zinc-400" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                    <Camera className="h-4 w-4" />
                    {addPhotoFile ? 'Cambiar foto' : 'Subir foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAddPhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {addPhotoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddPhotoFile(null)}
                    >
                      Quitar foto
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={equipmentForm.notes}
                onChange={(e) => setEquipmentForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button type="submit" className="w-full" disabled={addSaving}>
              {addSaving ? 'Registrando...' : 'Registrar en inventario'}
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        open={!!detailId}
        onClose={closeDetail}
        title={detail ? equipmentDisplayName(detail) : 'Detalle del equipo'}
        maxWidth="xl"
      >
        {detailLoading || !detail ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Badge variant={EQUIPMENT_STATUS_BADGE[detail.status]}>
                {EQUIPMENT_STATUS_LABELS[detail.status]}
              </Badge>
              <div className="flex flex-wrap gap-2">
                {!isAdmin && (
                  <Button variant="secondary" onClick={() => setReportOpen(true)}>
                    <AlertTriangle className="h-4 w-4" />
                    Reportar problema
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button variant="secondary" size="sm" onClick={openRepair}>
                      <Hammer className="h-4 w-4" />
                      Reparación
                    </Button>
                    <Button variant="secondary" size="sm" onClick={openEdit}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      ref={detailMoreRef}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 px-0"
                      onClick={() => setDetailMoreOpen((v) => !v)}
                      aria-label="Más acciones"
                      aria-expanded={detailMoreOpen}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <AnchoredMenu
                      open={detailMoreOpen}
                      onClose={() => setDetailMoreOpen(false)}
                      anchorRef={detailMoreRef}
                      align="end"
                    >
                      <div className="flex flex-col p-1">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <Camera className="h-4 w-4" />
                          Subir foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setDetailMoreOpen(false);
                              if (file) void handlePhotoUpload(file);
                            }}
                          />
                        </label>
                        {detail.status !== 'out_of_service' && (
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => {
                              setDetailMoreOpen(false);
                              setRetireReason('');
                              setRetireError('');
                              setRetireOpen(true);
                            }}
                          >
                            <Archive className="h-4 w-4" />
                            Retirar del gym
                          </button>
                        )}
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                          onClick={() => {
                            setDetailMoreOpen(false);
                            setDeleteError('');
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </AnchoredMenu>
                  </>
                )}
              </div>
            </div>

            {detail.photo_url && (
              <img
                src={resolveEquipmentPhotoUrl(detail.photo_url)}
                alt=""
                className="max-h-48 w-full rounded-xl object-cover"
              />
            )}

            <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">Zona:</span>{' '}
                {detail.zone_name ?? '—'}
              </p>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">Categoría:</span>{' '}
                {detail.catalog_category ? EQUIPMENT_CATEGORY_LABELS[detail.catalog_category] : '—'}
              </p>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">Marca / modelo:</span>{' '}
                {[detail.brand, detail.model].filter(Boolean).join(' ') || '—'}
              </p>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">Serie:</span>{' '}
                {detail.serial_number ?? '—'}
              </p>
              {detail.next_inspection_at && (
                <p className="flex items-center gap-1 sm:col-span-2">
                  <Clock className="h-4 w-4" />
                  Próxima inspección: {detail.next_inspection_at}
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_STATUSES.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={detail.status === status ? 'primary' : 'secondary'}
                    onClick={() => void handleStatusChange(status)}
                  >
                    {EQUIPMENT_STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-bold text-zinc-900 dark:text-white">Historial</h4>
              {events.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin eventos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-500">
                          {EQUIPMENT_EVENT_LABELS[
                            event.event_type as keyof typeof EQUIPMENT_EVENT_LABELS
                          ] ?? event.event_type}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(event.performed_at).toLocaleString('es')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {event.description}
                      </p>
                      {(event.vendor_name || event.cost_usd != null) && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {[
                            event.vendor_name,
                            event.cost_usd != null && !Number.isNaN(Number(event.cost_usd))
                              ? formatMoney(Number(event.cost_usd))
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {event.created_by_name && (
                        <p className="mt-1 text-[10px] text-zinc-400">{event.created_by_name}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Reportar problema">
        <form onSubmit={handleReport} className="space-y-4">
          <Textarea
            rows={4}
            placeholder="Describe el problema (ruido, pieza suelta, no enciende...)"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            required
          />
          {reportError && <p className="text-sm text-red-500">{reportError}</p>}
          <Button type="submit" className="w-full">
            Enviar reporte
          </Button>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar equipo" maxWidth="md">
        <form onSubmit={handleUpdateEquipment} className="space-y-4">
          {detail?.catalog_name && (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Tipo:{' '}
              <span className="font-semibold text-zinc-900 dark:text-white">
                {detail.catalog_name}
              </span>
            </p>
          )}
          <div>
            <Label>
              {detail?.catalog_id ? 'Nombre en el gym (opcional)' : 'Nombre del equipo'}
            </Label>
            <Input
              value={editForm.custom_name}
              onChange={(e) => setEditForm((f) => ({ ...f, custom_name: e.target.value }))}
              placeholder="Ej. Prensa piernas #2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Zona</Label>
              <Select
                value={editForm.zone_id}
                onChange={(e) => setEditForm((f) => ({ ...f, zone_id: e.target.value }))}
              >
                <option value="">Sin zona</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    status: e.target.value as EquipmentStatus,
                  }))
                }
              >
                {EQUIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EQUIPMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Marca</Label>
              <Input
                value={editForm.brand}
                onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={editForm.model}
                onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nº de serie</Label>
              <Input
                value={editForm.serial_number}
                onChange={(e) => setEditForm((f) => ({ ...f, serial_number: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={editForm.quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Próxima inspección</Label>
            <Input
              type="date"
              value={editForm.next_inspection_at}
              onChange={(e) => setEditForm((f) => ({ ...f, next_inspection_at: e.target.value }))}
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          {editError && <p className="text-sm text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={editSaving}>
              {editSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={
          <>
            Eliminar <span className="text-red-500">equipo</span>
          </>
        }
        maxWidth="sm"
        initialFocus="dialog"
      >
        {detail && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar <strong>{equipmentDisplayName(detail)}</strong> del inventario? Se borrará
              también su historial de mantenimiento. Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-zinc-500">
              Si el equipo ya no está en el gym pero quieres conservar el historial, usa{' '}
              <strong>Retirar</strong> en lugar de eliminar.
            </p>
            {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                disabled={deleting}
                onClick={() => void handleDeleteEquipment()}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={repairOpen}
        onClose={() => setRepairOpen(false)}
        title="Registrar reparación"
        maxWidth="md"
      >
        <form onSubmit={handleRepair} className="space-y-4">
          <div>
            <Label>Qué se hizo</Label>
            <Textarea
              rows={3}
              required
              placeholder="Ej. Cambio de cable, lubricación, ajuste de poleas..."
              value={repairForm.description}
              onChange={(e) => setRepairForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Proveedor (opcional)</Label>
              <Select
                value={repairForm.vendor_id}
                onChange={(e) => setRepairForm((f) => ({ ...f, vendor_id: e.target.value }))}
              >
                <option value="">Sin proveedor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Costo USD (opcional)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={repairForm.cost_usd}
                onChange={(e) => setRepairForm((f) => ({ ...f, cost_usd: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                required
                value={repairForm.performed_at}
                onChange={(e) => setRepairForm((f) => ({ ...f, performed_at: e.target.value }))}
              />
            </div>
            <div>
              <Label>Estado tras reparación</Label>
              <Select
                value={repairForm.new_status}
                onChange={(e) =>
                  setRepairForm((f) => ({
                    ...f,
                    new_status: e.target.value as EquipmentStatus | '',
                  }))
                }
              >
                <option value="">Sin cambio</option>
                {EQUIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EQUIPMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {repairError && <p className="text-sm text-red-500">{repairError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setRepairOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={repairSaving}>
              {repairSaving ? 'Guardando...' : 'Registrar reparación'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={retireOpen}
        onClose={() => setRetireOpen(false)}
        title="Retirar del gym"
        maxWidth="sm"
        initialFocus="dialog"
      >
        <form onSubmit={handleRetire} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            El equipo pasará a <strong>fuera de servicio</strong> y quedará en el historial. Úsalo
            cuando ya no esté en el local (vendido, sustituido, etc.).
          </p>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Ej. Vendida, sustituida por modelo nuevo..."
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
            />
          </div>
          {retireError && <p className="text-sm text-red-500">{retireError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setRetireOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={retiring}>
              {retiring ? 'Retirando...' : 'Retirar del gym'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
