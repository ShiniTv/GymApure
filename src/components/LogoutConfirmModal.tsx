import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, ModalActions } from './ui';

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({ open, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="¿Cerrar sesión?"
      description="Tendrás que volver a iniciar sesión para acceder a tu cuenta."
      icon={LogOut}
      tone="danger"
      maxWidth="sm"
      initialFocus="dialog"
      footer={
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Cerrar sesión
          </Button>
        </ModalActions>
      }
    ></Modal>
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
