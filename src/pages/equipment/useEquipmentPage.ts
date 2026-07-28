import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { groupEquipmentByZone } from '../../lib/equipment/inventoryHelpers';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, parseJsonResponse, ApiError } from '../../lib/api';
import { EQUIPMENT_STATUSES, type EquipmentStatus } from '../../lib/equipment/constants';
import { usePageTitle } from '../../hooks/usePageTitle';
import {
  useEquipmentCatalogQuery,
  useEquipmentDetailQuery,
  useEquipmentInventoryQuery,
  useEquipmentVendorsQuery,
  useEquipmentZonesQuery,
  useCreateEquipmentEventMutation,
  useCreateEquipmentMutation,
  useDeleteEquipmentMutation,
  useInvalidateEquipment,
  useUpdateEquipmentMutation,
} from '../../hooks/queries/useEquipmentQuery';
import { emptyEquipmentForm, emptyRepairForm, isInspectionDue } from './formDefaults';
import type { AddStep, CatalogItem, ConfigTab, EquipmentItem, LayoutView } from './types';

export function useEquipmentPage() {
  usePageTitle('Equipamiento');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const { invalidateInventory, invalidateMeta, invalidateDetail } = useInvalidateEquipment();
  const createEquipmentMutation = useCreateEquipmentMutation();
  const updateEquipmentMutation = useUpdateEquipmentMutation();
  const deleteEquipmentMutation = useDeleteEquipmentMutation();
  const createEquipmentEventMutation = useCreateEquipmentEventMutation();

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
  const [duplicateExistingId, setDuplicateExistingId] = useState<number | null>(null);

  const detailId = searchParams.get('detail');
  const detailIdNum = detailId ? Number(detailId) : null;

  const {
    data: allItems = [],
    isPending: inventoryPending,
    isError: inventoryError,
    refetch: refetchInventory,
  } = useEquipmentInventoryQuery(debouncedSearch);
  const { data: zones = [] } = useEquipmentZonesQuery();
  const { data: catalog = [] } = useEquipmentCatalogQuery();
  const { data: vendors = [] } = useEquipmentVendorsQuery(Boolean(isAdmin));
  const { data: detailPayload, isPending: detailLoading } = useEquipmentDetailQuery(
    detailIdNum != null && Number.isFinite(detailIdNum) ? detailIdNum : null
  );
  const detail = detailPayload?.equipment ?? null;
  const events = detailPayload?.events ?? [];
  const loading = inventoryPending;
  const bootstrapError = inventoryError;

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

  const registeredByCatalogId = useMemo(() => {
    const map = new Map<number, EquipmentItem>();
    for (const item of allItems) {
      if (item.catalog_id) map.set(item.catalog_id, item);
    }
    return map;
  }, [allItems]);

  const registeredCustomNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of allItems) {
      if (!item.catalog_id && item.custom_name?.trim()) {
        names.add(item.custom_name.trim().toLowerCase());
      }
    }
    return names;
  }, [allItems]);

  const loadInventory = useCallback(async () => {
    await invalidateInventory();
  }, [invalidateInventory]);

  const loadMeta = useCallback(async () => {
    await Promise.resolve(invalidateMeta());
  }, [invalidateMeta]);

  const loadDetail = useCallback(
    async (id: number) => {
      await invalidateDetail(id);
    },
    [invalidateDetail]
  );

  const refreshBootstrap = useCallback(async () => {
    await Promise.all([invalidateInventory(), Promise.resolve(invalidateMeta())]);
    await refetchInventory();
  }, [invalidateInventory, invalidateMeta, refetchInventory]);

  useEffect(() => {
    if (!addPhotoFile) {
      setAddPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(addPhotoFile);
    setAddPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [addPhotoFile]);

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
    setDuplicateExistingId(null);
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
    if (payload.catalog_id) {
      const existing = registeredByCatalogId.get(payload.catalog_id);
      if (existing) {
        setFormError('Este equipo ya está registrado. Edítalo para cambiar la cantidad.');
        setDuplicateExistingId(existing.id);
        return;
      }
    } else if (payload.custom_name) {
      const normalized = payload.custom_name.toLowerCase();
      if (registeredCustomNames.has(normalized)) {
        const existing = allItems.find(
          (item) => !item.catalog_id && item.custom_name?.trim().toLowerCase() === normalized
        );
        setFormError('Este equipo ya está registrado. Edítalo para cambiar la cantidad.');
        setDuplicateExistingId(existing?.id ?? null);
        return;
      }
    }
    setAddSaving(true);
    try {
      const created = await createEquipmentMutation.mutateAsync(payload);
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
      if (err instanceof ApiError && err.status === 409) {
        const details = err.details as { existing_id?: number } | undefined;
        if (details?.existing_id) setDuplicateExistingId(details.existing_id);
      }
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
      await createEquipmentEventMutation.mutateAsync({
        equipmentId: detail.id,
        payload: { description: reportText.trim(), event_type: 'report' },
      });
      setReportOpen(false);
      setReportText('');
      await Promise.all([loadInventory(), loadDetail(detail.id)]);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'No se pudo enviar el reporte');
    }
  };

  const handleStatusChange = async (status: EquipmentStatus) => {
    if (!detail || !isAdmin) return;
    await updateEquipmentMutation.mutateAsync({
      id: detail.id,
      payload: { status },
    });
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
      await updateEquipmentMutation.mutateAsync({
        id: detail.id,
        payload,
      });
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
      await deleteEquipmentMutation.mutateAsync(detail.id);
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
      await createEquipmentEventMutation.mutateAsync({
        equipmentId: detail.id,
        payload,
      });
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

  const handleCatalogPick = (item: CatalogItem) => {
    const existing = registeredByCatalogId.get(item.id);
    if (existing) {
      closeAddModal();
      openDetail(existing.id);
      return;
    }
    openAddFromCatalog(item);
  };

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
    setDuplicateExistingId(null);
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

  useEffect(() => {
    if (allItems.length === 0 && layoutView === 'zones') {
      setLayoutView('flat');
    }
  }, [allItems.length, layoutView]);

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

  return {
    isAdmin,
    loading,
    bootstrapError,
    refreshBootstrap,
    allItems,
    items,
    zones,
    catalog,
    vendors,
    zoneGroups,
    statusCounts,
    inspectionDueCount,
    attentionCount,
    activeFilterCount,
    adminSummaryFilter,
    handleAdminSummaryFilter,
    showAttentionAlert,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    zoneFilter,
    setZoneFilter,
    categoryFilter,
    setCategoryFilter,
    filtersOpen,
    setFiltersOpen,
    inspectionDueOnly,
    setInspectionDueOnly,
    staffQuickFilter,
    setStaffQuickFilter,
    layoutView,
    setLayoutView,
    clearFilters,
    openDetail,
    closeDetail,
    detailId,
    detail,
    events,
    detailLoading,
    detailMoreOpen,
    setDetailMoreOpen,
    detailMoreRef,
    openAddFromCatalog,
    closeAddModal,
    addOpen,
    addStep,
    setAddStep,
    catalogSearch,
    setCatalogSearch,
    catalogCategoryFilter,
    setCatalogCategoryFilter,
    filteredCatalog,
    registeredByCatalogId,
    handleCatalogPick,
    selectedCatalogId,
    setSelectedCatalogId,
    equipmentForm,
    setEquipmentForm,
    addPhotoFile,
    setAddPhotoFile,
    addPhotoPreview,
    formError,
    duplicateExistingId,
    addSaving,
    handleCreateEquipment,
    configOpen,
    setConfigOpen,
    configTab,
    setConfigTab,
    zoneName,
    setZoneName,
    handleAddZone,
    vendorForm,
    setVendorForm,
    handleAddVendor,
    reportOpen,
    setReportOpen,
    reportText,
    setReportText,
    reportError,
    handleReport,
    editOpen,
    setEditOpen,
    editForm,
    setEditForm,
    editError,
    editSaving,
    openEdit,
    handleUpdateEquipment,
    deleteOpen,
    setDeleteOpen,
    deleteError,
    setDeleteError,
    deleting,
    handleDeleteEquipment,
    repairOpen,
    setRepairOpen,
    repairForm,
    setRepairForm,
    repairError,
    repairSaving,
    openRepair,
    handleRepair,
    retireOpen,
    setRetireOpen,
    retireReason,
    setRetireReason,
    retireError,
    setRetireError,
    retiring,
    handleRetire,
    handleStatusChange,
    handlePhotoUpload,
  };
}
