import { Link } from 'react-router';

export function PaymentRejectionNote({ reason }: { reason?: string | null }) {
  return (
    <p className="text-small text-danger/90 mt-1 leading-snug">
      {reason?.trim() ? <>Motivo: {reason.trim()}. </> : <>Comprobante no verificado. </>}
      <Link to="/messages" className="font-semibold underline hover:text-red-400">
        Consulta Mensajes
      </Link>
    </p>
  );
}
