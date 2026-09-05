import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Search, CornerDownLeft, type LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavigationForRole } from '../config/navigation';
import { cn } from '../lib/utils';
import { useScrollLock } from '../hooks/useScrollLock';
import { prefetchRoute } from '../lib/routePrefetch';
import { typography } from '../lib/typography';

export interface CommandAction {
  id: string;
  label: string;
  href?: string;
  section: string;
  icon?: LucideIcon;
  keywords?: string;
  run?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  extraActions?: CommandAction[];
}

const EXIT_MS = 220;

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function buildNavActions(role: string | undefined): CommandAction[] {
  const sections = getNavigationForRole(role ?? 'member');
  const actions: CommandAction[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      actions.push({
        id: `nav:${item.href}`,
        label: item.name,
        href: item.href,
        section: section.name,
        icon: item.icon,
        keywords: `${section.name} ${item.name}`,
      });
    }
  }
  return actions;
}

const ROLE_QUICK: Record<string, CommandAction[]> = {
  admin: [
    {
      id: 'qa:checkin-tablet',
      label: 'Modo tablet',
      href: '/check-in?kiosk=1',
      section: 'Acciones',
      keywords: 'acceso mostrador tablet',
    },
    {
      id: 'qa:payments-pending',
      label: 'Pagos pendientes',
      href: '/payments?status=pending',
      section: 'Acciones',
      keywords: 'aprobar cola',
    },
    {
      id: 'qa:expiring',
      label: 'Miembros por vencer',
      href: '/members?expiring=true',
      section: 'Acciones',
      keywords: 'vencimiento renovar',
    },
  ],
  receptionist: [
    {
      id: 'qa:counter',
      label: 'Mostrador / acceso',
      href: '/reception?mode=counter&tab=access',
      section: 'Acciones',
      keywords: 'check-in recepción',
    },
  ],
  trainer: [
    {
      id: 'qa:members',
      label: 'Miembros',
      href: '/members',
      section: 'Acciones',
      keywords: 'alumnos roster',
    },
    {
      id: 'qa:assign',
      label: 'Asignar rutina',
      href: '/routines?view=calendar&assign=1',
      section: 'Acciones',
      keywords: 'programar calendario',
    },
    {
      id: 'qa:routines',
      label: 'Rutinas',
      href: '/routines',
      section: 'Acciones',
      keywords: 'entreno biblioteca',
    },
    {
      id: 'qa:calendar',
      label: 'Calendario',
      href: '/routines?view=calendar',
      section: 'Acciones',
      keywords: 'semana programacion',
    },
    {
      id: 'qa:nutrition',
      label: 'Nutrición',
      href: '/nutrition-overview',
      section: 'Acciones',
      keywords: 'macros plan',
    },
    {
      id: 'qa:pt-billing',
      label: 'Cobros PT',
      href: '/pt-billing',
      section: 'Acciones',
      keywords: 'factura pago',
    },
    {
      id: 'qa:messages',
      label: 'Mensajes',
      href: '/messages',
      section: 'Acciones',
      keywords: 'chat',
    },
  ],
  member: [
    {
      id: 'qa:train-now',
      label: 'Entrenar ahora',
      href: '/panel',
      section: 'Acciones',
      keywords: 'entreno workout hoy fab',
    },
    {
      id: 'qa:choose-routine',
      label: 'Elegir rutina de hoy',
      href: '/routines',
      section: 'Acciones',
      keywords: 'elegir hoy rutina picker',
    },
    {
      id: 'qa:templates',
      label: 'Plantillas para empezar',
      href: '/routines?view=templates',
      section: 'Acciones',
      keywords: 'plantilla template empezar',
    },
    {
      id: 'qa:workout',
      label: 'Mis rutinas',
      href: '/routines',
      section: 'Acciones',
      keywords: 'entreno workout rutina',
    },
    {
      id: 'qa:nutrition-log',
      label: 'Registrar comida',
      href: '/nutrition',
      section: 'Acciones',
      keywords: 'nutrición comida macros',
    },
  ],
};

export function CommandPalette({ open, onClose, extraActions = [] }: CommandPaletteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useScrollLock(open);

  const allActions = useMemo(() => {
    const nav = buildNavActions(user?.role);
    const roleQuick = ROLE_QUICK[user?.role ?? ''] ?? [];
    const seen = new Set<string>();
    const merged: CommandAction[] = [];
    for (const a of [...roleQuick, ...extraActions, ...nav]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      merged.push(a);
    }
    return merged;
  }, [user?.role, extraActions]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return allActions;
    return allActions.filter((a) => {
      const hay = normalize(`${a.label} ${a.section} ${a.keywords ?? ''} ${a.href ?? ''}`);
      return hay.includes(q);
    });
  }, [allActions, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, { action: CommandAction; index: number }[]>();
    filtered.forEach((action, index) => {
      const list = map.get(action.section) ?? [];
      list.push({ action, index });
      map.set(action.section, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const runAction = useCallback(
    (action: CommandAction) => {
      onCloseRef.current();
      if (action.run) {
        action.run();
        return;
      }
      if (action.href) {
        prefetchRoute(action.href);
        void navigate(action.href);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        runAction(filtered[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, runAction]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-start justify-center px-3 pt-[max(4rem,10dvh)] sm:px-4 sm:pt-[14vh]',
        'transition-opacity motion-reduce:transition-none'
      )}
      style={{
        transitionDuration: `${EXIT_MS}ms`,
        transitionTimingFunction: 'var(--ease-drawer)',
        opacity: visible ? 1 : 0,
      }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] dark:bg-black/70"
        aria-label="Cerrar búsqueda"
        onClick={() => onCloseRef.current()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar y navegar"
        className={cn(
          'surface-modal relative z-10 flex w-full max-w-lg flex-col overflow-hidden',
          'transition-[opacity,transform] motion-reduce:transform-none motion-reduce:transition-none',
          '[transition-timing-function:var(--ease-drawer)]',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
        )}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
      >
        <div className="border-border/50 flex items-center gap-2.5 border-b px-3.5 py-3">
          <Search
            className="operate-icon text-text-muted h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar páginas y acciones…"
            className="text-text placeholder:text-text-muted min-w-0 flex-1 bg-transparent text-sm font-medium tracking-[-0.011em] outline-none"
            aria-autocomplete="list"
            aria-controls="cmdk-list"
          />
          <kbd className="text-text-muted border-border/60 bg-surface-raised text-small hidden rounded-[var(--radius-chip)] border px-1.5 py-0.5 font-semibold sm:inline">
            Esc
          </kbd>
        </div>

        <div
          id="cmdk-list"
          ref={listRef}
          role="listbox"
          className="scroll-area max-h-[min(52vh,24rem)] overflow-y-auto py-2"
        >
          {filtered.length === 0 ? (
            <p className="text-text-muted px-4 py-8 text-center text-sm">Sin resultados</p>
          ) : (
            grouped.map(([section, items]) => (
              <div key={section} className="mb-1.5 last:mb-0">
                <p className="text-text-muted text-small px-3.5 pt-1.5 pb-1 font-semibold tracking-[-0.01em]">
                  {section}
                </p>
                <ul className="px-1.5">
                  {items.map(({ action, index }) => {
                    const Icon = action.icon;
                    const active = index === activeIndex;
                    return (
                      <li key={action.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-cmd-index={index}
                          onMouseEnter={() => {
                            setActiveIndex(index);
                            if (action.href) prefetchRoute(action.href);
                          }}
                          onClick={() => runAction(action)}
                          className={cn(
                            'flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-button)] px-2.5 py-2 text-left text-sm transition-colors',
                            active
                              ? 'bg-surface-raised text-text dark:bg-surface-overlay shadow-xs'
                              : 'text-text-secondary hover:bg-surface-overlay/50 hover:text-text'
                          )}
                        >
                          {Icon ? (
                            <Icon
                              className={cn(
                                'operate-icon h-4 w-4 shrink-0',
                                active ? 'text-text' : 'text-text-muted'
                              )}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          ) : (
                            <span className="h-4 w-4 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium tracking-[-0.011em]">
                            {action.label}
                          </span>
                          {active ? (
                            <CornerDownLeft
                              className="operate-icon text-text-muted h-3.5 w-3.5 shrink-0"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div
          className={cn(
            'border-border/50 text-text-muted text-small flex items-center gap-2 border-t px-3.5 py-2',
            typography.small
          )}
        >
          <span className="border-border/50 bg-surface-raised inline-flex items-center rounded-[var(--radius-chip)] border px-1.5 py-0.5 font-semibold">
            ↑↓
          </span>
          <span>navegar</span>
          <span className="border-border/50 bg-surface-raised ml-1 inline-flex items-center rounded-[var(--radius-chip)] border px-1.5 py-0.5 font-semibold">
            ↵
          </span>
          <span>abrir</span>
          <span className="ml-auto hidden font-medium sm:inline">Ctrl / ⌘ K</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Global Ctrl/⌘K toggle; call from Layout. */
export function useCommandPaletteShortcut(onToggle: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle]);
}
