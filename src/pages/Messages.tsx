import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../lib/roles';
import { StaffChatView } from './messages/StaffChatView';
import { MemberChatView } from './messages/MemberChatView';

export default function Messages() {
  const { user } = useAuth();
  const isStaff = user?.role != null && isStaffRole(user.role);

  if (isStaff) return <StaffChatView />;
  return <MemberChatView />;
}
