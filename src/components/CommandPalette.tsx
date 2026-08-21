import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Search, CornerDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavigationForRole } from '../config/navigation';
import { cn } from '../lib/utils';
import { useScrollLock } from '../hooks/useScrollLock';
import { prefetchRoute } from '../lib/routePrefetch';
import type { LucideIcon } from 'lucide-react';

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
      href: '/routines?tab=templates',
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
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
      onClose();
      if (action.run) {
        action.run();
        return;
      }
      if (action.href) {
        prefetchRoute(action.href);
        void navigate(action.href);
      }
    },
    [navigate, onClose]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
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
  }, [open, filtered, activeIndex, onClose, runAction]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        aria-label="Cerrar búsqueda"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar y navegar"
        className="border-border/70 bg-surface shadow-elevated relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-card)] border"
      >
        <div className="border-border/60 flex items-center gap-2 border-b px-3 py-2.5">
          <Search className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar páginas y acciones…"
            className="text-text placeholder:text-text-muted min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-autocomplete="list"
            aria-controls="cmdk-list"
          />
          <kbd className="text-text-muted border-border/70 hidden rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline">
            Esc
          </kbd>
        </div>
        <div
          id="cmdk-list"
          ref={listRef}
          role="listbox"
          className="scroll-area max-h-[min(50vh,22rem)] overflow-y-auto py-1.5"
        >
          {filtered.length === 0 ? (
            <p className="text-text-muted px-3 py-6 text-center text-sm">Sin resultados</p>
          ) : (
            filtered.map((action, index) => {
              const Icon = action.icon;
              const active = index === activeIndex;
              return (
                <button
                  key={action.id}
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
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-surface-overlay text-text'
                      : 'text-text-secondary hover:bg-surface-raised'
                  )}
                >
                  {Icon ? (
                    <Icon className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <span className="h-4 w-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{action.label}</span>
                  <span className="text-text-muted shrink-0 text-[10px] tracking-wide uppercase">
                    {action.section}
                  </span>
                  {active && <CornerDownLeft className="text-text-muted h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
        <div className="border-border/50 text-text-muted flex items-center gap-3 border-t px-3 py-1.5 text-[10px]">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span className="ml-auto hidden sm:inline">Ctrl/⌘ K</span>
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
