import { Button, CedulaInput, Label, Modal } from '../../components/ui';

interface ReceptionCounterModalsProps {
  checkoutConfirm: { cedula: string; name: string } | null;
  onCloseCheckout: () => void;
  onConfirmCheckout: () => void;
  actionLoading: boolean;

  cedulaEditOpen: boolean;
  onCloseCedulaEdit: () => void;
  cedulaEditValue: string;
  onCedulaEditValueChange: (value: string) => void;
  cedulaEditError: string;
  onClearCedulaEditError: () => void;
  cedulaEditSaving: boolean;
  onSaveCedulaEdit: () => void;
}

export function ReceptionCounterModals({
  checkoutConfirm,
  onCloseCheckout,
  onConfirmCheckout,
  actionLoading,
  cedulaEditOpen,
  onCloseCedulaEdit,
  cedulaEditValue,
  onCedulaEditValueChange,
  cedulaEditError,
  onClearCedulaEditError,
  cedulaEditSaving,
  onSaveCedulaEdit,
}: ReceptionCounterModalsProps) {
  return (
    <>
      <Modal
        open={checkoutConfirm != null}
        onClose={onCloseCheckout}
        title="¿Registrar salida?"
        maxWidth="sm"
      >
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Se registrará la salida de{' '}
          <strong className="text-zinc-900 dark:text-white">{checkoutConfirm?.name}</strong> del
          gym.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCloseCheckout}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={onConfirmCheckout} loading={actionLoading}>
            Registrar salida
          </Button>
        </div>
      </Modal>

      <Modal
        open={cedulaEditOpen}
        onClose={onCloseCedulaEdit}
        title={
          <>
            Corregir <span className="text-brand">cédula</span>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Cédula / ID</Label>
            <CedulaInput
              value={cedulaEditValue}
              onChange={(value) => {
                onCedulaEditValueChange(value);
                if (cedulaEditError) onClearCedulaEditError();
              }}
            />
            {cedulaEditError && (
              <p className="mt-2 text-sm font-medium text-red-500">{cedulaEditError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={onCloseCedulaEdit}>
              Cancelar
            </Button>
            <Button className="flex-1" loading={cedulaEditSaving} onClick={onSaveCedulaEdit}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
