import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useChatUnreadQuery } from './queries/useChatQuery';
import { useTrainerStatsQuery } from './queries/useDashboardQuery';
import { useReceptionStatsQuery } from './queries/useReceptionStatsQuery';
import {
  formatExpiryCountdown,
  getExpirySeverity,
  MEMBER_UI_ALERT_DAYS,
  shouldShowExpiryAlert,
} from '../lib/expiryUtils';
import {
  notificationItemWeight,
  type NotificationItem,
  type NotificationSeverity,
} from '../lib/notifications/types';

function expirySeverity(days: number, alertDays: number): NotificationSeverity {
  const s = getExpirySeverity(days, alertDays);
  return s === 'ok' ? 'info' : s;
}

export function useNotificationItems() {
  const { user } = useAuth();
  const role = user?.role ?? 'member';

  const showChatNav =
    role === 'admin' || role === 'trainer' || role === 'receptionist' || role === 'member';

  const { data: chatUnread = 0, isLoading: chatLoading } = useChatUnreadQuery(showChatNav);
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const { data: trainerStats, isLoading: trainerLoading } = useTrainerStatsQuery(
    role === 'trainer'
  );
  const { data: receptionStats, isLoading: receptionLoading } = useReceptionStatsQuery(
    role === 'receptionist'
  );

  const items = useMemo((): NotificationItem[] => {
    const result: NotificationItem[] = [];

    if (showChatNav && chatUnread > 0) {
      result.push({
        id: 'chat-unread',
        title: 'Mensajes sin leer',
        description: chatUnread === 1 ? '1 mensaje nuevo' : `${chatUnread} mensajes nuevos`,
        href: '/messages',
        count: chatUnread,
        severity: 'info',
      });
    }

    if (role === 'member') {
      const pending = memberStats?.stats?.pendingPayments ?? 0;
      if (pending > 0) {
        result.push({
          id: 'member-pending-payment',
          title: 'Pago en revisión',
          description:
            pending === 1
              ? '1 pago pendiente de verificación'
              : `${pending} pagos pendientes de verificación`,
          href: '/payments',
          count: pending,
          severity: 'warning',
        });
      }

      const days = memberStats?.stats?.subscription?.days_remaining;
      if (days != null && shouldShowExpiryAlert(days, MEMBER_UI_ALERT_DAYS)) {
        result.push({
          id: 'member-expiry',
          title: 'Membresía por vencer',
          description: formatExpiryCountdown(days),
          href: '/payments',
          count: 1,
          severity: expirySeverity(days, MEMBER_UI_ALERT_DAYS),
        });
      }
    }

    if (role === 'admin') {
      const pending = adminStats?.stats?.pendingPayments ?? 0;
      if (pending > 0) {
        result.push({
          id: 'admin-pending-payments',
          title: 'Pagos por aprobar',
          description:
            pending === 1 ? '1 pago espera aprobación' : `${pending} pagos esperan aprobación`,
          href: '/payments?status=pending',
          count: pending,
          severity: 'warning',
        });
      }

      const expiring = adminStats?.stats?.expiringSoon ?? adminStats?.expiringSoon ?? 0;
      if (expiring > 0) {
        result.push({
          id: 'admin-expiring',
          title: 'Membresías por vencer',
          description:
            expiring === 1 ? '1 membresía vence pronto' : `${expiring} membresías vencen pronto`,
          href: '/members',
          count: expiring,
          severity: 'warning',
        });
      }
    }

    if (role === 'receptionist') {
      const pending = receptionStats?.pendingPayments ?? 0;
      if (pending > 0) {
        result.push({
          id: 'reception-pending-payments',
          title: 'Pagos pendientes',
          description: pending === 1 ? '1 pago por revisar' : `${pending} pagos por revisar`,
          href: '/payments?status=pending',
          count: pending,
          severity: 'warning',
        });
      }
    }

    if (role === 'trainer') {
      const expiring = trainerStats?.expiringMembers?.length ?? 0;
      if (expiring > 0) {
        const minDays = Math.min(
          ...(trainerStats?.expiringMembers?.map((m) => m.days_remaining) ?? [7])
        );
        const alertDays = trainerStats?.expiryAlertDays ?? 7;
        result.push({
          id: 'trainer-expiring',
          title: 'Miembros por vencer',
          description:
            expiring === 1
              ? '1 miembro con membresía por vencer'
              : `${expiring} miembros con membresía por vencer`,
          href: '/members',
          count: expiring,
          severity: expirySeverity(minDays, alertDays),
        });
      }

      const withoutRoutines = trainerStats?.membersWithoutRoutines ?? 0;
      if (withoutRoutines > 0) {
        result.push({
          id: 'trainer-no-routine',
          title: 'Sin rutina asignada',
          description:
            withoutRoutines === 1
              ? '1 miembro sin rutina activa'
              : `${withoutRoutines} miembros sin rutina activa`,
          href: '/routines?view=assignments',
          count: withoutRoutines,
          severity: 'info',
        });
      }
    }

    return result;
  }, [
    showChatNav,
    chatUnread,
    role,
    memberStats?.stats,
    adminStats?.stats,
    adminStats?.expiringSoon,
    receptionStats?.pendingPayments,
    trainerStats,
  ]);

  const badgeCount = useMemo(
    () => items.reduce((sum, item) => sum + notificationItemWeight(item), 0),
    [items]
  );

  const isLoading =
    (showChatNav && chatLoading) ||
    (role === 'trainer' && trainerLoading) ||
    (role === 'receptionist' && receptionLoading);

  return { items, badgeCount, isLoading };
}
