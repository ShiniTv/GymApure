import { Link } from 'react-router-dom';

export function PaymentRejectionNote({ reason }: { reason?: string | null }) {
  return (
    <p className="mt-1 text-[10px] leading-snug text-red-500/90">
      {reason?.trim() ? <>Motivo: {reason.trim()}. </> : <>Comprobante no verificado. </>}
      <Link to="/messages" className="font-semibold underline hover:text-red-400">
        Consulta Mensajes
      </Link>
    </p>
  );
}
