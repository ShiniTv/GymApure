import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Camera, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from '../../lib/equipment/constants';
import {
  Badge,
  Button,
  FilterChips,
  Input,
  Label,
  Modal,
  SearchInput,
  Select,
  Textarea,
} from '../../components/ui';
import { emptyEquipmentForm } from './formDefaults';
import type { AddStep, CatalogItem, EquipmentFormState, EquipmentItem, Zone } from './types';

interface EquipmentAddModalProps {
  open: boolean;
  onClose: () => void;
  addStep: AddStep;
  onAddStepChange: (step: AddStep) => void;
  catalogSearch: string;
  onCatalogSearchChange: (value: string) => void;
  catalogCategoryFilter: string;
  onCatalogCategoryFilterChange: (value: string) => void;
  catalog: CatalogItem[];
  filteredCatalog: CatalogItem[];
  registeredByCatalogId: Map<number, EquipmentItem>;
  onCatalogPick: (item: CatalogItem) => void;
  selectedCatalogId: number | null;
  onSelectedCatalogIdChange: (id: number | null) => void;
  equipmentForm: EquipmentFormState;
  onEquipmentFormChange: Dispatch<SetStateAction<EquipmentFormState>>;
  zones: Zone[];
  addPhotoFile: File | null;
  addPhotoPreview: string | null;
  onAddPhotoFileChange: (file: File | null) => void;
  formError: string;
  duplicateExistingId: number | null;
  onOpenExisting: (id: number) => void;
  addSaving: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function EquipmentAddModal({
  open,
  onClose,
  addStep,
  onAddStepChange,
  catalogSearch,
  onCatalogSearchChange,
  catalogCategoryFilter,
  onCatalogCategoryFilterChange,
  catalog,
  filteredCatalog,
  registeredByCatalogId,
  onCatalogPick,
  selectedCatalogId,
  onSelectedCatalogIdChange,
  equipmentForm,
  onEquipmentFormChange,
  zones,
  addPhotoFile,
  addPhotoPreview,
  onAddPhotoFileChange,
  formError,
  duplicateExistingId,
  onOpenExisting,
  addSaving,
  onSubmit,
}: EquipmentAddModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={addStep === 'pick' ? 'Elegir tipo de máquina' : 'Registrar en el gym'}
      maxWidth={addStep === 'pick' ? 'lg' : 'md'}
      initialFocus={addStep === 'pick' ? 'input' : 'dialog'}
    >
      {addStep === 'pick' ? (
        <div className="space-y-4">
          <SearchInput
            value={catalogSearch}
            onChange={(e) => onCatalogSearchChange(e.target.value)}
            placeholder="Smith, prensa, cinta..."
          />
          <FilterChips
            value={catalogCategoryFilter}
            onChange={onCatalogCategoryFilterChange}
            options={[
              { value: 'all', label: 'Todas' },
              ...EQUIPMENT_CATEGORIES.map((c) => ({
                value: c,
                label: EQUIPMENT_CATEGORY_LABELS[c],
              })),
            ]}
          />
          <div className="border-border bg-surface-raised max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {filteredCatalog.length === 0 ? (
              <p className="text-text-muted px-2 py-4 text-center text-sm">
                {catalog.length === 0
                  ? 'Biblioteca vacía. Aplica las migraciones de base de datos.'
                  : 'No hay resultados para esta búsqueda.'}
              </p>
            ) : (
              filteredCatalog.map((item) => {
                const existing = registeredByCatalogId.get(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onCatalogPick(item)}
                    className={cn(
                      'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm transition-colors',
                      existing
                        ? 'bg-surface-raised/80 text-text-secondary hover:bg-surface-raised'
                        : 'text-text hover:bg-surface-raised'
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{item.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {existing && (
                        <Badge variant="default" className="px-1.5 py-0.5 text-[10px]">
                          Registrado
                        </Badge>
                      )}
                      <span className="text-text-muted text-xs">
                        {EQUIPMENT_CATEGORY_LABELS[item.category]}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              onSelectedCatalogIdChange(null);
              onEquipmentFormChange(emptyEquipmentForm);
              onAddStepChange('details');
            }}
          >
            Equipo personalizado (no está en la biblioteca)
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1"
            onClick={() => onAddStepChange('pick')}
          >
            <ChevronLeft className="h-4 w-4" />
            Cambiar tipo
          </Button>
          {selectedCatalogId && (
            <p className="bg-surface-raised text-text-secondary rounded-lg px-3 py-2 text-sm">
              Tipo:{' '}
              <span className="text-text font-semibold">
                {catalog.find((c) => c.id === selectedCatalogId)?.name ?? equipmentForm.custom_name}
              </span>
            </p>
          )}
          <div>
            <Label>{selectedCatalogId ? 'Nombre en el gym (opcional)' : 'Nombre del equipo'}</Label>
            <Input
              value={equipmentForm.custom_name}
              onChange={(e) =>
                onEquipmentFormChange((f) => ({ ...f, custom_name: e.target.value }))
              }
              placeholder="Ej. Prensa piernas #2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Zona</Label>
              <Select
                value={equipmentForm.zone_id}
                onChange={(e) => onEquipmentFormChange((f) => ({ ...f, zone_id: e.target.value }))}
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
                  onEquipmentFormChange((f) => ({
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
                onChange={(e) => onEquipmentFormChange((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={equipmentForm.model}
                onChange={(e) => onEquipmentFormChange((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Próxima inspección</Label>
            <Input
              type="date"
              value={equipmentForm.next_inspection_at}
              onChange={(e) =>
                onEquipmentFormChange((f) => ({ ...f, next_inspection_at: e.target.value }))
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
                <div className="border-border bg-surface-raised flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed">
                  <Camera className="text-text-muted h-6 w-6" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2">
                <label className="border-border hover:bg-surface-raised inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors">
                  <Camera className="h-4 w-4" />
                  {addPhotoFile ? 'Cambiar foto' : 'Subir foto'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onAddPhotoFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                {addPhotoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddPhotoFileChange(null)}
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
              onChange={(e) => onEquipmentFormChange((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          {formError && (
            <div className="space-y-2">
              <p className="text-sm text-red-500">{formError}</p>
              {duplicateExistingId && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenExisting(duplicateExistingId);
                  }}
                >
                  Editar equipo existente
                </Button>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={addSaving}>
            {addSaving ? 'Registrando...' : 'Registrar en inventario'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
