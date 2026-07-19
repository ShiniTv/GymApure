import type { FormEvent } from 'react';
import { Button, Input, Modal, SegmentedControl } from '../../components/ui';
import type { ConfigTab, Vendor, Zone } from './types';

interface EquipmentConfigModalProps {
  open: boolean;
  onClose: () => void;
  configTab: ConfigTab;
  onConfigTabChange: (tab: ConfigTab) => void;
  zoneName: string;
  onZoneNameChange: (value: string) => void;
  onAddZone: (e: FormEvent) => void;
  zones: Zone[];
  vendorForm: {
    name: string;
    contact_name: string;
    phone: string;
    email: string;
  };
  onVendorFormChange: (patch: Partial<EquipmentConfigModalProps['vendorForm']>) => void;
  onAddVendor: (e: FormEvent) => void;
  vendors: Vendor[];
}

export function EquipmentConfigModal({
  open,
  onClose,
  configTab,
  onConfigTabChange,
  zoneName,
  onZoneNameChange,
  onAddZone,
  zones,
  vendorForm,
  onVendorFormChange,
  onAddVendor,
  vendors,
}: EquipmentConfigModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración de equipamiento"
      maxWidth="lg"
      initialFocus="dialog"
    >
      <SegmentedControl
        value={configTab}
        onChange={(v) => onConfigTabChange(v)}
        className="mb-4 w-full"
        fullWidth
        options={[
          { value: 'zones', label: 'Zonas' },
          { value: 'vendors', label: 'Proveedores' },
        ]}
      />
      {configTab === 'zones' ? (
        <>
          <form onSubmit={onAddZone} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nombre de zona (ej. Cardio)"
              value={zoneName}
              onChange={(e) => onZoneNameChange(e.target.value)}
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
          <form onSubmit={onAddVendor} className="mb-4 grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Nombre del proveedor"
              value={vendorForm.name}
              onChange={(e) => onVendorFormChange({ name: e.target.value })}
            />
            <Input
              placeholder="Contacto"
              value={vendorForm.contact_name}
              onChange={(e) => onVendorFormChange({ contact_name: e.target.value })}
            />
            <Input
              placeholder="Teléfono"
              value={vendorForm.phone}
              onChange={(e) => onVendorFormChange({ phone: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={vendorForm.email}
              onChange={(e) => onVendorFormChange({ email: e.target.value })}
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
  );
}
