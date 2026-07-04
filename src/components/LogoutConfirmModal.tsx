import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Modal } from './ui';

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({ open, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="¿Cerrar sesión?" maxWidth="sm">
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Tendrás que volver a iniciar sesión para acceder a tu cuenta.
      </p>
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm}>
          Cerrar sesión
        </Button>
      </div>
    </Modal>
  );
}

export function useLogoutConfirm() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return {
    requestLogout: () => setOpen(true),
    logoutConfirmProps: {
      open,
      onClose: () => setOpen(false),
      onConfirm: () => {
        setOpen(false);
        logout();
      },
    },
  };
}
