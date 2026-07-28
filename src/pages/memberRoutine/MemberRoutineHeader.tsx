import { Link } from 'react-router';
import {
  ChevronRight,
  History,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react';
import {
  AnchoredMenu,
  Avatar,
  Breadcrumbs,
  Button,
  IconButton,
  PageHeader,
} from '../../components/ui';
import type { MemberUser, Routine, Subscription } from './types';
import type { CoachingTab } from './utils';
import { formatMemberGoal } from './utils';

export interface CoachingInsight {
  tone: 'danger' | 'warning';
  message: string;
  actionLabel?: string;
  run?: () => void;
}

interface MemberRoutineHeaderProps {
  member: MemberUser;
  memberId: string | undefined;
  routines: Routine[];
  subscription: Subscription | null;
  coachingTab: CoachingTab;
  showHealthAlert: boolean;
  coachingInsight: CoachingInsight | null;
  headerPrimary: { label: string; run: () => void; solid: boolean };
  moreMenuOpen: boolean;
  moreSectionsOpen: boolean;
  moreMenuAnchorRef: React.RefObject<HTMLButtonElement | null>;
  moreSectionsAnchorRef: React.RefObject<HTMLButtonElement | null>;
  onMoreMenuOpenChange: (open: boolean) => void;
  onMoreSectionsOpenChange: (open: boolean) => void;
  onChangeTab: (tab: CoachingTab) => void;
  onNavigate: (path: string) => void;
  onCreateRoutine: () => void;
  onAssignRoutine: () => void;
}

const PRIMARY_TABS = [
  { value: 'rutinas', label: 'Rutinas' },
  { value: 'progreso', label: 'Progreso' },
  { value: 'bloques', label: 'Bloques' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'coaching', label: 'Coaching' },
] as const;

const MORE_TABS = [
  { value: 'notas', label: 'Notas' },
  { value: 'perfil', label: 'Perfil' },
] as const;

export function MemberRoutineHeader({
  member,
  memberId,
  routines,
  subscription,
  coachingTab,
  showHealthAlert,
  coachingInsight,
  headerPrimary,
  moreMenuOpen,
  moreSectionsOpen,
  moreMenuAnchorRef,
  moreSectionsAnchorRef,
  onMoreMenuOpenChange,
  onMoreSectionsOpenChange,
  onChangeTab,
  onNavigate,
  onCreateRoutine,
  onAssignRoutine,
}: MemberRoutineHeaderProps) {
  return (
    <>
      <Link
        to="/members"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-zinc-800 sm:hidden dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
        Miembros
      </Link>
      <Breadcrumbs
        className="mb-0 hidden sm:block"
        items={[
          { label: 'Miembros', href: '/members' },
          { label: member.full_name, href: `/members/${memberId}/routines` },
          { label: 'Rutinas' },
        ]}
      />

      <PageHeader
        compact
        showTitleOnMobile
        title={
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={member.full_name} size="sm" className="shrink-0" />
            <span className="truncate">{member.full_name}</span>
          </span>
        }
        subtitle={
          [
            coachingTab === 'rutinas'
              ? `${routines.length} rutina${routines.length !== 1 ? 's' : ''}`
              : null,
            subscription
              ? `${subscription.membership_name} · ${subscription.days_remaining} días`
              : null,
            member.goal ? formatMemberGoal(member.goal) : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        action={
          <div className="flex shrink-0 items-center gap-1">
            {headerPrimary.solid ? (
              <Button
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={headerPrimary.run}
                aria-label={headerPrimary.label}
              >
                {headerPrimary.label === 'Asignar' ? <Plus className="h-3.5 w-3.5" /> : null}
                <span>{headerPrimary.label}</span>
              </Button>
            ) : (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={headerPrimary.label}
                title={headerPrimary.label}
                onClick={headerPrimary.run}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </IconButton>
            )}
            <IconButton
              ref={moreMenuAnchorRef}
              size="sm"
              variant="ghost"
              aria-label="Más acciones"
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              onClick={() => onMoreMenuOpenChange(!moreMenuOpen)}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        }
      />

      <AnchoredMenu
        open={moreMenuOpen}
        onClose={() => onMoreMenuOpenChange(false)}
        anchorRef={moreMenuAnchorRef}
        className="min-w-[11rem]"
      >
        {headerPrimary.label !== 'Mensaje' && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => {
              onMoreMenuOpenChange(false);
              onNavigate(`/messages?member=${memberId}`);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Mensaje
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            onMoreMenuOpenChange(false);
            onNavigate(`/members/${memberId}/history`);
          }}
        >
          <History className="h-4 w-4" />
          Historial
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            onMoreMenuOpenChange(false);
            onNavigate(`/members/${memberId}/records`);
          }}
        >
          <Trophy className="h-4 w-4" />
          Marcas
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            onMoreMenuOpenChange(false);
            onNavigate(`/members/${memberId}/nutrition`);
          }}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Nutrición
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            onMoreMenuOpenChange(false);
            onCreateRoutine();
          }}
        >
          <Plus className="h-4 w-4" />
          Crear rutina
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            onMoreMenuOpenChange(false);
            onAssignRoutine();
          }}
        >
          <Plus className="h-4 w-4" />
          Asignar rutina
        </button>
      </AnchoredMenu>

      {showHealthAlert ? (
        <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
          Alerta de salud activa — revisa el perfil del miembro.
        </p>
      ) : null}

      <div className="border-border/60 -mx-0.5 border-b">
        <div
          className="flex items-end gap-0.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones del miembro"
        >
          {PRIMARY_TABS.map((tab) => {
            const active = coachingTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeTab(tab.value)}
                className={
                  active
                    ? 'text-text border-brand shrink-0 border-b-2 px-2.5 pt-0.5 pb-2 text-[13px] font-semibold whitespace-nowrap'
                    : 'text-text-muted hover:text-text shrink-0 border-b-2 border-transparent px-2.5 pt-0.5 pb-2 text-[13px] font-medium whitespace-nowrap'
                }
              >
                {tab.label}
              </button>
            );
          })}
          <div className="relative shrink-0">
            <button
              type="button"
              ref={moreSectionsAnchorRef}
              onClick={() => onMoreSectionsOpenChange(!moreSectionsOpen)}
              aria-expanded={moreSectionsOpen}
              aria-haspopup="menu"
              className={
                coachingTab === 'notas' || coachingTab === 'perfil'
                  ? 'text-text border-brand border-b-2 px-2.5 pt-0.5 pb-2 text-[13px] font-semibold whitespace-nowrap'
                  : 'text-text-muted hover:text-text border-b-2 border-transparent px-2.5 pt-0.5 pb-2 text-[13px] font-medium whitespace-nowrap'
              }
            >
              Más
            </button>
            <AnchoredMenu
              open={moreSectionsOpen}
              onClose={() => onMoreSectionsOpenChange(false)}
              anchorRef={moreSectionsAnchorRef}
              className="min-w-[9rem]"
            >
              {MORE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => {
                    onMoreSectionsOpenChange(false);
                    onChangeTab(tab.value);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </AnchoredMenu>
          </div>
        </div>
      </div>

      {coachingInsight ? (
        <div
          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12px] ${
            coachingInsight.tone === 'danger'
              ? 'bg-red-500/10 text-red-700 dark:text-red-300'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
          }`}
          role="status"
        >
          <p className="min-w-0 flex-1 leading-snug">{coachingInsight.message}</p>
          {coachingInsight.actionLabel && coachingInsight.run ? (
            <button
              type="button"
              onClick={coachingInsight.run}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold underline-offset-2 hover:underline"
            >
              {coachingInsight.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
