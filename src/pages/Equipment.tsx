import { Skeleton } from '../components/ui';
import { EquipmentConfigModal } from './equipment/EquipmentConfigModal';
import { EquipmentDetailModal } from './equipment/EquipmentDetailModal';
import { EquipmentAddModal } from './equipment/EquipmentAddModal';
import { EquipmentInventorySection } from './equipment/EquipmentInventorySection';
import { EquipmentActionModals } from './equipment/EquipmentActionModals';
import { useEquipmentPage } from './equipment/useEquipmentPage';

export default function Equipment() {
  const page = useEquipmentPage();

  if (page.loading) {
    return (
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-3 sm:space-y-4">
        <Skeleton className="h-11 w-11 rounded-[var(--radius-button)]" />
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <EquipmentInventorySection
        isAdmin={page.isAdmin}
        allItems={page.allItems}
        items={page.items}
        zones={page.zones}
        zoneGroups={page.zoneGroups}
        statusCounts={page.statusCounts}
        inspectionDueCount={page.inspectionDueCount}
        attentionCount={page.attentionCount}
        activeFilterCount={page.activeFilterCount}
        adminSummaryFilter={page.adminSummaryFilter}
        onAdminSummaryFilter={page.handleAdminSummaryFilter}
        showAttentionAlert={page.showAttentionAlert}
        search={page.search}
        onSearchChange={page.setSearch}
        statusFilter={page.statusFilter}
        onStatusFilterChange={page.setStatusFilter}
        zoneFilter={page.zoneFilter}
        onZoneFilterChange={page.setZoneFilter}
        categoryFilter={page.categoryFilter}
        onCategoryFilterChange={page.setCategoryFilter}
        filtersOpen={page.filtersOpen}
        onFiltersOpenChange={page.setFiltersOpen}
        inspectionDueOnly={page.inspectionDueOnly}
        onInspectionDueOnlyChange={page.setInspectionDueOnly}
        staffQuickFilter={page.staffQuickFilter}
        onStaffQuickFilterChange={page.setStaffQuickFilter}
        layoutView={page.layoutView}
        onLayoutViewChange={page.setLayoutView}
        onClearFilters={page.clearFilters}
        bootstrapError={page.bootstrapError}
        onRetry={() => void page.refreshBootstrap()}
        onOpenDetail={page.openDetail}
        onOpenConfig={() => page.setConfigOpen(true)}
        onOpenAdd={() => page.openAddFromCatalog()}
      />

      <EquipmentConfigModal
        open={page.configOpen}
        onClose={() => page.setConfigOpen(false)}
        configTab={page.configTab}
        onConfigTabChange={page.setConfigTab}
        zoneName={page.zoneName}
        onZoneNameChange={page.setZoneName}
        onAddZone={page.handleAddZone}
        zones={page.zones}
        vendorForm={page.vendorForm}
        onVendorFormChange={(patch) => page.setVendorForm((f) => ({ ...f, ...patch }))}
        onAddVendor={page.handleAddVendor}
        vendors={page.vendors}
      />

      <EquipmentAddModal
        open={page.addOpen}
        onClose={page.closeAddModal}
        addStep={page.addStep}
        onAddStepChange={page.setAddStep}
        catalogSearch={page.catalogSearch}
        onCatalogSearchChange={page.setCatalogSearch}
        catalogCategoryFilter={page.catalogCategoryFilter}
        onCatalogCategoryFilterChange={page.setCatalogCategoryFilter}
        catalog={page.catalog}
        filteredCatalog={page.filteredCatalog}
        registeredByCatalogId={page.registeredByCatalogId}
        onCatalogPick={page.handleCatalogPick}
        selectedCatalogId={page.selectedCatalogId}
        onSelectedCatalogIdChange={page.setSelectedCatalogId}
        equipmentForm={page.equipmentForm}
        onEquipmentFormChange={page.setEquipmentForm}
        zones={page.zones}
        addPhotoFile={page.addPhotoFile}
        addPhotoPreview={page.addPhotoPreview}
        onAddPhotoFileChange={page.setAddPhotoFile}
        formError={page.formError}
        duplicateExistingId={page.duplicateExistingId}
        onOpenExisting={page.openDetail}
        addSaving={page.addSaving}
        onSubmit={page.handleCreateEquipment}
      />

      <EquipmentDetailModal
        open={!!page.detailId}
        onClose={page.closeDetail}
        detail={page.detail}
        events={page.events}
        detailLoading={page.detailLoading}
        isAdmin={page.isAdmin}
        detailMoreOpen={page.detailMoreOpen}
        detailMoreRef={page.detailMoreRef}
        onDetailMoreOpenChange={page.setDetailMoreOpen}
        onReport={() => page.setReportOpen(true)}
        onRepair={page.openRepair}
        onEdit={page.openEdit}
        onPhotoUpload={(file) => void page.handlePhotoUpload(file)}
        onRetireOpen={() => {
          page.setRetireReason('');
          page.setRetireError('');
          page.setRetireOpen(true);
        }}
        onDeleteOpen={() => {
          page.setDeleteError('');
          page.setDeleteOpen(true);
        }}
        onStatusChange={(status) => void page.handleStatusChange(status)}
      />

      <EquipmentActionModals
        detail={page.detail}
        zones={page.zones}
        vendors={page.vendors}
        reportOpen={page.reportOpen}
        onReportOpenChange={page.setReportOpen}
        reportText={page.reportText}
        onReportTextChange={page.setReportText}
        reportError={page.reportError}
        onReport={page.handleReport}
        editOpen={page.editOpen}
        onEditOpenChange={page.setEditOpen}
        editForm={page.editForm}
        onEditFormChange={page.setEditForm}
        editError={page.editError}
        editSaving={page.editSaving}
        onUpdate={page.handleUpdateEquipment}
        deleteOpen={page.deleteOpen}
        onDeleteOpenChange={page.setDeleteOpen}
        deleteError={page.deleteError}
        deleting={page.deleting}
        onDelete={page.handleDeleteEquipment}
        repairOpen={page.repairOpen}
        onRepairOpenChange={page.setRepairOpen}
        repairForm={page.repairForm}
        onRepairFormChange={page.setRepairForm}
        repairError={page.repairError}
        repairSaving={page.repairSaving}
        onRepair={page.handleRepair}
        retireOpen={page.retireOpen}
        onRetireOpenChange={page.setRetireOpen}
        retireReason={page.retireReason}
        onRetireReasonChange={page.setRetireReason}
        retireError={page.retireError}
        retiring={page.retiring}
        onRetire={page.handleRetire}
      />
    </>
  );
}
