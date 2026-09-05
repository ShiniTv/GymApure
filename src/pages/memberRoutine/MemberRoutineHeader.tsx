import { Link } from 'react-router';
import {
  AlertTriangle,
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
import { AnchoredMenu, Avatar, Breadcrumbs, Button, IconButton } from '../../components/ui';
import { OperateCallout } from '../../components/operate/OperateChrome';
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
  'tap-feedback text-text hover:bg-surface-raised flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium tracking-[-0.011em]';

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

  const metaBits = [
    coachingTab === 'rutinas' || coachingTab === 'bloques'
      ? `${routines.length} rutina${routines.length !== 1 ? 's' : ''}`
      : null,
    subscription ? `${subscription.membership_name} · ${subscription.days_remaining}d` : null,
    member.goal ? formatMemberGoal(member.goal) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      <Link
        to="/members"
        className="text-text-muted hover:text-text -ml-0.5 inline-flex items-center gap-0.5 text-xs font-medium sm:hidden"
      >
        <ChevronRight className="operate-icon h-3.5 w-3.5 rotate-180" aria-hidden />
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

      {/* Identity row — compact coach desk */}
      <header className="flex items-center gap-3">
        <Avatar
          name={member.full_name}
          size="lg"
          className="shrink-0 ring-1 ring-[color:var(--color-border)] !ring-offset-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className={cn(typography.pageTitle, 'truncate text-[1.125rem] leading-tight')}>
            {member.full_name}
          </h1>
          {metaBits.length > 0 ? (
            <p className="text-text-muted mt-0.5 truncate text-[0.8125rem] leading-snug tracking-[-0.01em]">
              {metaBits.join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerPrimary.solid ? (
            <Button
              size="sm"
              className="h-9 min-h-9 gap-1 px-2.5 text-xs"
              onClick={headerPrimary.run}
              aria-label={headerPrimary.label}
            >
              {headerPrimary.label === 'Asignar' ? (
                <Plus className="operate-icon h-3.5 w-3.5" aria-hidden />
              ) : null}
              <span>{headerPrimary.label}</span>
            </Button>
          ) : (
            <IconButton
              size="md"
              variant="secondary"
              aria-label={headerPrimary.label}
              title={headerPrimary.label}
              onClick={headerPrimary.run}
            >
              <MessageSquare className="operate-icon h-4 w-4" />
            </IconButton>
          )}
          <IconButton
            ref={moreMenuAnchorRef}
            size="md"
            variant="secondary"
            aria-label="Más en esta ficha"
            aria-expanded={moreMenuOpen}
            aria-haspopup="menu"
            onClick={() => onMoreMenuOpenChange(!moreMenuOpen)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <AnchoredMenu
        open={moreMenuOpen}
        onClose={() => onMoreMenuOpenChange(false)}
        anchorRef={moreMenuAnchorRef}
        className="min-w-[12.5rem] overflow-hidden rounded-[var(--radius-card)]"
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
            <MessageSquare className="operate-icon text-text-muted h-4 w-4" />
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
          <User className="operate-icon text-text-muted h-4 w-4" />
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
          <NotebookPen className="operate-icon text-text-muted h-4 w-4" />
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
          <CalendarDays className="operate-icon text-text-muted h-4 w-4" />
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
          <History className="operate-icon text-text-muted h-4 w-4" />
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
          <Trophy className="operate-icon text-text-muted h-4 w-4" />
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
          <UtensilsCrossed className="operate-icon text-text-muted h-4 w-4" />
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
          <Plus className="operate-icon text-text-muted h-4 w-4" />
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
          <Plus className="operate-icon text-text-muted h-4 w-4" />
          Asignar rutina
        </button>
      </AnchoredMenu>

      {showHealthAlert ? (
        <OperateCallout icon={AlertTriangle} tone="danger" onClick={() => onChangeTab('perfil')}>
          Alerta de salud activa — revisa el perfil del miembro.
        </OperateCallout>
      ) : null}

      {/* Primary tabs — underline, not heavy boxes */}
      <nav aria-label="Secciones del miembro">
        <div
          className="border-border/70 flex gap-4 overflow-x-auto overscroll-x-contain border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
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
                className={cn(
                  'tap-feedback relative -mb-px shrink-0 pb-2 text-[0.8125rem] whitespace-nowrap transition-colors',
                  active
                    ? 'text-text border-brand border-b-2 font-semibold tracking-[-0.012em]'
                    : 'text-text-muted hover:text-text border-b-2 border-transparent font-medium'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {primary === 'plan' ? (
          <div className="mt-2 flex items-center gap-1" role="tablist" aria-label="Plan">
            {PLAN_SUB_TABS.map((tab) => {
              const active = coachingTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangeTab(tab.value)}
                  className={cn(
                    'tap-feedback h-8 rounded-[var(--radius-chip)] px-2.5 text-xs transition-colors',
                    active
                      ? 'bg-surface-raised text-text font-semibold'
                      : 'text-text-muted hover:text-text hover:bg-surface-raised/60 font-medium'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {primary === 'coaching' ? (
          <p className={cn(typography.small, 'text-text-muted mt-2')}>
            Registro semanal. Notas y agenda en «Más en esta ficha».
          </p>
        ) : null}
      </nav>

      {coachingInsight ? (
        <OperateCallout
          icon={AlertTriangle}
          tone={coachingInsight.tone === 'danger' ? 'danger' : 'warn'}
          onClick={coachingInsight.run}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{coachingInsight.message}</span>
            {coachingInsight.actionLabel ? (
              <span className="text-text font-semibold">{coachingInsight.actionLabel}</span>
            ) : null}
          </span>
        </OperateCallout>
      ) : null}
    </div>
  );
}
