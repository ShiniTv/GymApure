import { Link } from 'react-router';
import {
  ChevronRight,
  History,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  CalendarDays,
  Plus,
  Trophy,
  User,
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
import { typography } from '../../lib/typography';
import { cn } from '../../lib/utils';
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
  moreMenuAnchorRef: React.RefObject<HTMLButtonElement | null>;
  onMoreMenuOpenChange: (open: boolean) => void;
  onChangeTab: (tab: CoachingTab) => void;
  onNavigate: (path: string) => void;
  onCreateRoutine: () => void;
  onAssignRoutine: () => void;
}

const PRIMARY_TABS = [
  { value: 'plan', label: 'Plan' },
  { value: 'coaching', label: 'Seguimiento' },
  { value: 'progreso', label: 'Progreso' },
] as const;

const PLAN_SUB_TABS: { value: CoachingTab; label: string }[] = [
  { value: 'rutinas', label: 'Rutinas' },
  { value: 'bloques', label: 'Bloques' },
];

function hubPrimaryTab(tab: CoachingTab): (typeof PRIMARY_TABS)[number]['value'] {
  if (tab === 'rutinas' || tab === 'bloques') return 'plan';
  if (tab === 'coaching' || tab === 'notas' || tab === 'agenda') return 'coaching';
  if (tab === 'progreso' || tab === 'mediciones') return 'progreso';
  return 'plan';
}

function primaryTabToDefault(tab: (typeof PRIMARY_TABS)[number]['value']): CoachingTab {
  if (tab === 'plan') return 'rutinas';
  if (tab === 'coaching') return 'coaching';
  return 'progreso';
}

const TAB_LABELS: Record<CoachingTab, string> = {
  rutinas: 'Rutinas',
  progreso: 'Progreso',
  bloques: 'Bloques',
  agenda: 'Agenda',
  coaching: 'Registro semanal',
  notas: 'Notas',
  perfil: 'Perfil',
  mediciones: 'Progreso',
};

const MENU_ITEM =
  'text-text hover:bg-surface-raised flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm';

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
  moreMenuAnchorRef,
  onMoreMenuOpenChange,
  onChangeTab,
  onNavigate,
  onCreateRoutine,
  onAssignRoutine,
}: MemberRoutineHeaderProps) {
  const primary = hubPrimaryTab(coachingTab);

  return (
    <>
      <Link
        to="/members"
        className="text-text-muted hover:text-text inline-flex items-center gap-1 text-xs font-medium sm:hidden"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
        Miembros
      </Link>
      <Breadcrumbs
        className="mb-0 hidden sm:block"
        items={[
          { label: 'Miembros', href: '/members' },
          { label: member.full_name, href: `/members/${memberId}/routines` },
          { label: TAB_LABELS[coachingTab] ?? 'Rutinas' },
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
                variant="secondary"
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
              variant="secondary"
              aria-label="Más en esta ficha"
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
        className="min-w-[12rem]"
      >
        {headerPrimary.label !== 'Mensaje' && (
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM}
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
          className={MENU_ITEM}
          onClick={() => {
            onMoreMenuOpenChange(false);
            onChangeTab('perfil');
          }}
        >
          <User className="h-4 w-4" />
          Perfil
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM}
          onClick={() => {
            onMoreMenuOpenChange(false);
            onChangeTab('notas');
          }}
        >
          <NotebookPen className="h-4 w-4" />
          Notas
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM}
          onClick={() => {
            onMoreMenuOpenChange(false);
            onChangeTab('agenda');
          }}
        >
          <CalendarDays className="h-4 w-4" />
          Agenda
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM}
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
          className={MENU_ITEM}
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
          className={MENU_ITEM}
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
          className={MENU_ITEM}
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
          className={MENU_ITEM}
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
        <p className={cn(typography.small, 'text-danger font-medium')}>
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
            const active = primary === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeTab(primaryTabToDefault(tab.value))}
                className={
                  active
                    ? 'text-text border-brand shrink-0 border-b-2 px-2.5 pt-0.5 pb-2 text-sm font-semibold whitespace-nowrap'
                    : 'text-text-muted hover:text-text shrink-0 border-b-2 border-transparent px-2.5 pt-0.5 pb-2 text-sm font-medium whitespace-nowrap'
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {primary === 'plan' ? (
          <div className="mt-1 flex gap-1 px-0.5 pb-2">
            {PLAN_SUB_TABS.map((tab) => {
              const active = coachingTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onChangeTab(tab.value)}
                  className={
                    active
                      ? 'bg-brand/10 text-brand rounded-[var(--radius-chip)] px-2.5 py-0.5 text-xs font-semibold'
                      : 'text-text-muted hover:text-text rounded-[var(--radius-chip)] px-2.5 py-0.5 text-xs font-medium'
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {primary === 'coaching' ? (
          <p className={cn(typography.small, 'text-text-muted px-0.5 pt-1.5 pb-2')}>
            Registro semanal. Notas y agenda en «Más en esta ficha».
          </p>
        ) : null}
      </div>

      {coachingInsight ? (
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs',
            coachingInsight.tone === 'danger'
              ? 'bg-danger/10 text-danger'
              : 'bg-warning/10 text-warning'
          )}
          role="status"
        >
          <p className="min-w-0 flex-1 leading-snug">{coachingInsight.message}</p>
          {coachingInsight.actionLabel && coachingInsight.run ? (
            <button
              type="button"
              onClick={coachingInsight.run}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline"
            >
              {coachingInsight.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
