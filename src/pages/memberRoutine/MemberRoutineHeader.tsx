import { useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ChevronLeft,
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
  ShieldAlert,
} from 'lucide-react';
import { AnchoredMenu, Avatar, Button, IconButton, Badge } from '../../components/ui';
import { OperateCallout } from '../../components/operate/OperateChrome';
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

export interface MemberRoutineHeaderProps {
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
  { value: 'perfil', label: 'Perfil' },
] as const;

const PLAN_SUB_TABS: { value: CoachingTab; label: string }[] = [
  { value: 'rutinas', label: 'Rutinas' },
  { value: 'bloques', label: 'Bloques' },
];

const COACHING_SUB_TABS: { value: CoachingTab; label: string }[] = [
  { value: 'coaching', label: 'Registro semanal' },
  { value: 'notas', label: 'Notas' },
  { value: 'agenda', label: 'Agenda' },
];

const PROGRESO_SUB_TABS: { value: CoachingTab; label: string }[] = [
  { value: 'progreso', label: 'Cargas' },
  { value: 'mediciones', label: 'Mediciones' },
];

export function hubPrimaryTab(tab: CoachingTab): (typeof PRIMARY_TABS)[number]['value'] {
  if (tab === 'rutinas' || tab === 'bloques') return 'plan';
  if (tab === 'coaching' || tab === 'notas' || tab === 'agenda') return 'coaching';
  if (tab === 'progreso' || tab === 'mediciones') return 'progreso';
  if (tab === 'perfil') return 'perfil';
  return 'plan';
}

export function primaryTabToDefault(tab: (typeof PRIMARY_TABS)[number]['value']): CoachingTab {
  if (tab === 'plan') return 'rutinas';
  if (tab === 'coaching') return 'coaching';
  if (tab === 'progreso') return 'progreso';
  return 'perfil';
}

const MENU_ITEM =
  'tap-feedback text-text hover:bg-surface-raised flex min-h-9 w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs font-medium tracking-tight';

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
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null);

  const metaBits = [
    coachingTab === 'rutinas' || coachingTab === 'bloques'
      ? `${routines.length} rutina${routines.length !== 1 ? 's' : ''}`
      : null,
    subscription ? `${subscription.membership_name} · ${subscription.days_remaining}d` : null,
    member.goal ? formatMemberGoal(member.goal) : null,
  ].filter(Boolean) as string[];

  const menuContent = (
    <AnchoredMenu
      open={moreMenuOpen}
      onClose={() => onMoreMenuOpenChange(false)}
      anchorRef={moreMenuAnchorRef}
      anchorEl={activeAnchor}
      align="start"
      className="border-border/70 min-w-[12rem] overflow-hidden rounded-xl border p-1 shadow-md"
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
          <MessageSquare className="operate-icon text-text-muted h-3.5 w-3.5" />
          Mensaje directo
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
        <User className="operate-icon text-text-muted h-3.5 w-3.5" />
        Ficha y perfil
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
        <NotebookPen className="operate-icon text-text-muted h-3.5 w-3.5" />
        Notas del coach
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
        <CalendarDays className="operate-icon text-text-muted h-3.5 w-3.5" />
        Agenda de sesiones
      </button>
      <div className="border-border/60 my-1 border-t" />
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM}
        onClick={() => {
          onMoreMenuOpenChange(false);
          onNavigate(`/members/${memberId}/history`);
        }}
      >
        <History className="operate-icon text-text-muted h-3.5 w-3.5" />
        Historial de entrenamientos
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
        <Trophy className="operate-icon text-text-muted h-3.5 w-3.5" />
        Récords personales
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
        <UtensilsCrossed className="operate-icon text-text-muted h-3.5 w-3.5" />
        Plan nutricional
      </button>
      <div className="border-border/60 my-1 border-t" />
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM}
        onClick={() => {
          onMoreMenuOpenChange(false);
          onCreateRoutine();
        }}
      >
        <Plus className="operate-icon text-text-muted h-3.5 w-3.5" />
        Crear nueva rutina
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
        <Plus className="operate-icon text-text-muted h-3.5 w-3.5" />
        Asignar del catálogo
      </button>
    </AnchoredMenu>
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP DOSSIER SIDEBAR (>= lg)
          Sticky, self-contained client info rail
      ───────────────────────────────────────────────────────────── */}
      <aside className="hidden shrink-0 space-y-3 lg:sticky lg:top-3 lg:block">
        <Link
          to="/members"
          className="text-text-muted hover:text-text inline-flex items-center gap-1 text-xs font-semibold tracking-tight transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Volver a miembros</span>
        </Link>

        {/* Member Profile Dossier Card */}
        <div className="border-border/70 bg-surface space-y-3.5 rounded-xl border p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <Avatar
              name={member.full_name}
              size="md"
              className="ring-border/80 h-11 w-11 shrink-0 text-sm font-semibold shadow-2xs ring-1"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-text truncate text-sm font-bold tracking-tight">
                {member.full_name}
              </h2>
              {member.goal ? (
                <p className="text-text-muted mt-0.5 truncate text-[0.75rem] font-medium">
                  {formatMemberGoal(member.goal)}
                </p>
              ) : null}
              {subscription ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="default" className="px-1.5 py-0 text-[0.6875rem]">
                    {subscription.membership_name}
                  </Badge>
                  <span className="text-text-muted text-[0.6875rem] font-medium tabular-nums">
                    {subscription.days_remaining}d restantes
                  </span>
                </div>
              ) : (
                <Badge variant="default" className="mt-1 px-1.5 py-0 text-[0.6875rem] opacity-70">
                  Sin membresía activa
                </Badge>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {headerPrimary.solid ? (
              <Button
                size="sm"
                className="h-8 flex-1 gap-1.5 text-xs"
                onClick={headerPrimary.run}
                aria-label={headerPrimary.label}
              >
                {headerPrimary.label === 'Asignar' ? (
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                ) : null}
                <span>{headerPrimary.label}</span>
              </Button>
            ) : null}
            <IconButton
              size="sm"
              variant="secondary"
              aria-label="Enviar mensaje"
              title="Enviar mensaje"
              onClick={() => onNavigate(`/messages?member=${memberId}`)}
              className="h-8 w-8"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              size="sm"
              variant="secondary"
              aria-label="Más acciones"
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                setActiveAnchor(e.currentTarget);
                onMoreMenuOpenChange(!moreMenuOpen);
              }}
              className="h-8 w-8"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {/* Alerts & Insights */}
          {showHealthAlert && (
            <button
              type="button"
              onClick={() => onChangeTab('perfil')}
              className="border-danger/30 bg-danger/10 text-danger hover:bg-danger/15 flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="leading-tight font-medium">Alerta de salud activa</span>
            </button>
          )}

          {coachingInsight && (
            <button
              type="button"
              onClick={coachingInsight.run}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors',
                coachingInsight.tone === 'danger'
                  ? 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/15'
                  : 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/15'
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="leading-tight font-medium">{coachingInsight.message}</span>
            </button>
          )}

          {/* Quick Shortcuts */}
          <div className="border-border/60 space-y-1 border-t pt-2">
            <p className="text-text-muted px-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
              Accesos rápidos
            </p>
            <button
              type="button"
              onClick={() => onNavigate(`/members/${memberId}/history`)}
              className="text-text hover:bg-surface-raised/70 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <History className="text-text-muted h-3.5 w-3.5" />
                Historial de sesiones
              </span>
              <ChevronRight className="text-text-muted/60 h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(`/members/${memberId}/records`)}
              className="text-text hover:bg-surface-raised/70 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <Trophy className="text-text-muted h-3.5 w-3.5" />
                Récords y marcas
              </span>
              <ChevronRight className="text-text-muted/60 h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(`/members/${memberId}/nutrition`)}
              className="text-text hover:bg-surface-raised/70 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <UtensilsCrossed className="text-text-muted h-3.5 w-3.5" />
                Plan nutricional
              </span>
              <ChevronRight className="text-text-muted/60 h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE COMPACT HEADER (< lg)
          Single streamlined 44px topbar
      ───────────────────────────────────────────────────────────── */}
      <header className="space-y-2 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/members"
              className="text-text-muted hover:text-text -ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              aria-label="Volver a miembros"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Avatar
              name={member.full_name}
              size="sm"
              className="ring-border/80 h-7 w-7 shrink-0 text-xs font-semibold ring-1"
            />
            <div className="min-w-0">
              <h1 className="text-text truncate text-xs leading-tight font-bold tracking-tight sm:text-sm">
                {member.full_name}
              </h1>
              {metaBits.length > 0 ? (
                <p className="text-text-muted truncate text-[0.6875rem] leading-tight font-medium">
                  {metaBits.join(' · ')}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {headerPrimary.solid ? (
              <Button
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={headerPrimary.run}
                aria-label={headerPrimary.label}
              >
                {headerPrimary.label === 'Asignar' ? (
                  <Plus className="h-3 w-3" aria-hidden />
                ) : null}
                <span>{headerPrimary.label}</span>
              </Button>
            ) : (
              <IconButton
                size="sm"
                variant="secondary"
                aria-label={headerPrimary.label}
                title={headerPrimary.label}
                onClick={headerPrimary.run}
                className="h-7 w-7"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </IconButton>
            )}
            <IconButton
              size="sm"
              variant="secondary"
              aria-label="Más en esta ficha"
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                setActiveAnchor(e.currentTarget);
                onMoreMenuOpenChange(!moreMenuOpen);
              }}
              className="h-7 w-7"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>

        {showHealthAlert && (
          <OperateCallout icon={AlertTriangle} tone="danger" onClick={() => onChangeTab('perfil')}>
            Alerta de salud activa — revisa el perfil del miembro.
          </OperateCallout>
        )}

        {coachingInsight && (
          <OperateCallout
            icon={AlertTriangle}
            tone={coachingInsight.tone === 'danger' ? 'danger' : 'warn'}
            onClick={coachingInsight.run}
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span>{coachingInsight.message}</span>
              {coachingInsight.actionLabel ? (
                <span className="text-text font-semibold">{coachingInsight.actionLabel}</span>
              ) : null}
            </span>
          </OperateCallout>
        )}
      </header>

      {menuContent}
    </>
  );
}

/**
 * Clean, compact primary & secondary tab strip
 */
export function MemberRoutineTabs({
  coachingTab,
  onChangeTab,
}: {
  coachingTab: CoachingTab;
  onChangeTab: (tab: CoachingTab) => void;
}) {
  const primary = hubPrimaryTab(coachingTab);

  return (
    <nav aria-label="Secciones del miembro" className="space-y-2">
      {/* Primary tabs — crisp hairline */}
      <div
        className="border-border/60 flex gap-4 overflow-x-auto overscroll-x-contain border-b [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
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
                'tap-feedback relative -mb-px shrink-0 pb-2 text-xs whitespace-nowrap transition-colors sm:text-[0.8125rem]',
                active
                  ? 'text-text border-brand border-b-2 font-semibold'
                  : 'text-text-muted hover:text-text border-b-2 border-transparent font-medium'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs — sleek compact segmented control (28px) */}
      {primary === 'plan' ? (
        <div
          className="bg-surface-raised/90 border-border/60 inline-flex items-center gap-1 rounded-lg border p-0.5"
          role="tablist"
          aria-label="Plan"
        >
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
                  'tap-feedback h-7 rounded-md px-2.5 text-[0.75rem] font-medium transition-all',
                  active
                    ? 'bg-surface text-text border-border/70 border font-semibold shadow-2xs'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {primary === 'coaching' ? (
        <div
          className="bg-surface-raised/90 border-border/60 inline-flex items-center gap-1 rounded-lg border p-0.5"
          role="tablist"
          aria-label="Seguimiento"
        >
          {COACHING_SUB_TABS.map((tab) => {
            const active = coachingTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeTab(tab.value)}
                className={cn(
                  'tap-feedback h-7 rounded-md px-2.5 text-[0.75rem] font-medium transition-all',
                  active
                    ? 'bg-surface text-text border-border/70 border font-semibold shadow-2xs'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {primary === 'progreso' ? (
        <div
          className="bg-surface-raised/90 border-border/60 inline-flex items-center gap-1 rounded-lg border p-0.5"
          role="tablist"
          aria-label="Progreso"
        >
          {PROGRESO_SUB_TABS.map((tab) => {
            const active = coachingTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeTab(tab.value)}
                className={cn(
                  'tap-feedback h-7 rounded-md px-2.5 text-[0.75rem] font-medium transition-all',
                  active
                    ? 'bg-surface text-text border-border/70 border font-semibold shadow-2xs'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}
