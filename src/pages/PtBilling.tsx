import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { PageShellSkeleton } from '../components/ui';
import TrainerPtBilling from './TrainerPtBilling';
import MemberPtBilling from './MemberPtBilling';

/** Role gate for /pt-billing — trainer ledger vs member report UI. */
export default function PtBilling() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <PageShellSkeleton />;
  }
  if (user?.role === 'trainer') return <TrainerPtBilling />;
  if (user?.role === 'member') return <MemberPtBilling />;
  return <Navigate to="/panel" replace />;
}
