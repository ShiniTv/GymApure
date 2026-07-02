import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from './animations';
import { useAuth } from '../context/AuthContext';
import { useProfileQuery } from '../hooks/queries/useProfileQuery';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useTheme } from '../context/ThemeContext';
import {
  expiryNavDotClass,
  MEMBER_UI_ALERT_DAYS,
  shouldShowExpiryAlert,
} from '../lib/expiryUtils';
import Logo from './Logo';
import BrandName from './BrandName';
import { ScrollToTop } from './ScrollToTop';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import { BRAND } from '../config/brand';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Dumbbell,
  LogOut,
  Menu,
  X,
  History,
  Sun,
  Moon,
  BarChart2,
  BookOpen,
  ScrollText,
  UserCircle,
  FileSpreadsheet,
  CalendarClock,
  Settings2,
  Fingerprint,
  MessageSquare,
  UtensilsCrossed,
  PanelLeftClose,
} from 'lucide-react';
import { useChatUnreadQuery } from '../hooks/queries/useChatQuery';
import clsx from 'clsx';
import { ROLE_LABELS } from '../lib/roles';
import { Avatar } from './ui';
import { MemberBottomNav } from './member/MemberBottomNav';
import { ThemeOnboarding } from './member/ThemeOnboarding';
import { THEME_ONBOARDING_KEY } from '../config/themes';
import { useMediaQuery } from '../lib/useMediaQuery';

const ROLE_LABELS_LOCAL = ROLE_LABELS;

const iconBtnClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: string[];
}

interface NavSection {
  name: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    name: 'Gestión',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'trainer', 'member', 'receptionist'] },
      { name: 'Recepción', href: '/reception', icon: Fingerprint, roles: ['admin', 'receptionist'] },
      { name: 'Miembros', href: '/members', icon: Users, roles: ['admin', 'trainer', 'receptionist'] },
      { name: 'Membresías', href: '/memberships', icon: CreditCard, roles: ['admin'] },
      { name: 'Pagos', href: '/payments', icon: CreditCard, roles: ['admin', 'member', 'receptionist'] },
    ],
  },
  {
    name: 'Seguimiento',
    items: [
      { name: 'Asistencias', href: '/attendance', icon: BarChart2, roles: ['admin'] },
      { name: 'Reportes', href: '/reports', icon: FileSpreadsheet, roles: ['admin'] },
      { name: 'Auditoría', href: '/audit-logs', icon: ScrollText, roles: ['admin'] },
      { name: 'Mensajes', href: '/messages', icon: MessageSquare, roles: ['admin', 'trainer', 'receptionist', 'member'] },
    ],
  },
  {
    name: 'Fitness',
    items: [
      { name: 'Rutinas', href: '/routines', icon: Dumbbell, roles: ['trainer', 'member'] },
      { name: 'Asignaciones', href: '/routines?view=assignments', icon: CalendarClock, roles: ['trainer'] },
      { name: 'Ejercicios', href: '/exercises', icon: BookOpen, roles: ['trainer'] },
      { name: 'Historial', href: '/history', icon: History, roles: ['member'] },
      { name: 'Nutrición', href: '/nutrition', icon: UtensilsCrossed, roles: ['member'] },
    ],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle, roles: ['admin', 'trainer', 'member', 'receptionist'] },
      { name: 'Configuración', href: '/settings', icon: Settings2, roles: ['admin'] },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const touchStartX = useRef(0);
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const expiringCount = adminStats?.expiringSoon ?? 0;
  const memberExpiryDays = memberStats?.stats?.subscription?.days_remaining ?? null;
  const showChatNav =
    user?.role === 'admin' ||
    user?.role === 'trainer' ||
    user?.role === 'receptionist' ||
    user?.role === 'member';
  const { data: chatUnread = 0 } = useChatUnreadQuery(showChatNav);
  const isMember = user?.role === 'member';
  const isMemberMobileShell = isMember && useMediaQuery('(max-width: 1023px)');
  const [showThemeOnboarding, setShowThemeOnboarding] = useState(false);

  useEffect(() => {
    if (isMember && !localStorage.getItem(THEME_ONBOARDING_KEY)) {
      setShowThemeOnboarding(true);
    }
  }, [isMember]);

  const isNavActive = (href: string) => {
    const [path, search = ''] = href.split('?');
    if (location.pathname !== path) return false;
    if (!search) {
      if (path === '/routines' && location.search.includes('view=')) return false;
      return true;
    }
    const expected = new URLSearchParams(search);
    const current = new URLSearchParams(location.search);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return true;
  };

  const allFiltered = useMemo(
    () =>
      NAV_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((item) => item.roles.includes(user?.role ?? '')),
      })).filter((s) => s.items.length > 0),
    [user?.role]
  );

  const currentPage = useMemo(
    () => allFiltered.flatMap((s) => s.items).find((item) => isNavActive(item.href))?.name,
    [allFiltered, location.pathname, location.search]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (deltaX > 60 && touchStartX.current < 40) {
        setIsSidebarOpen(true);
      } else if (deltaX < -60 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    },
    [isSidebarOpen]
  );

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen]);

  const brandMark = <BrandName variant="split" />;
  const mobileHeaderTitle = currentPage ?? BRAND.name;

  const SIDEBAR_WIDTH = sidebarCollapsed ? 'w-16' : 'w-60';

  return (
    <div
      className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand focus:text-white focus:font-semibold"
      >
        Saltar al contenido
      </a>
      {/* Mobile Header */}
      <div className={clsx(
        'lg:hidden flex items-center justify-between gap-2 px-3 h-14 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50',
        isMemberMobileShell && 'top-0'
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            {currentPage ? (
              <>
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate leading-tight">
                  {mobileHeaderTitle}
                </p>
                <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-300 truncate leading-tight">
                  {BRAND.name}
                </p>
              </>
            ) : (
              <BrandName variant="inline" size="sm" className="truncate leading-tight" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <InstallPrompt />
          <button type="button" onClick={toggleTheme} className={iconBtnClass} aria-label="Cambiar tema">
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => { setIsSidebarOpen(!isSidebarOpen); }}
            className={iconBtnClass}
            aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={clsx(
            'fixed top-14 bottom-0 left-0 z-40 transform bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200 ease-in-out lg:top-0 lg:inset-y-0 lg:static lg:translate-x-0',
            SIDEBAR_WIDTH,
            isMemberMobileShell && isSidebarOpen && 'z-[60]',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Sidebar Header */}
          {sidebarCollapsed ? (
            <div className="hidden lg:flex h-14 items-center justify-center border-b border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => { setSidebarCollapsed(false); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Expandir menú"
                title="Expandir menú"
              >
                <Logo className="h-8 w-8 shrink-0 pointer-events-none" />
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex h-14 items-center gap-2.5 px-3 border-b border-zinc-200 dark:border-zinc-800">
              <Logo className="h-8 w-8 shrink-0" />
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {brandMark}
                </motion.div>
              </AnimatePresence>
              <button
                type="button"
                onClick={() => { setSidebarCollapsed(true); }}
                className="ml-auto h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Colapsar menú"
                title="Colapsar menú"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col h-full lg:h-[calc(100dvh-3.5rem)]">
            <nav className={clsx('nav-stack flex-1 min-h-0 scroll-area py-2.5 lg:py-3', sidebarCollapsed ? 'px-0' : 'px-2.5')}>
              {allFiltered.map((section) => (
                <div key={section.name} className="mb-2">
                  {!sidebarCollapsed && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2.5 mb-1 mt-1">
                      {section.name}
                    </p>
                  )}
                  {section.items.map((item) => {
                    const isActive = isNavActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => { setIsSidebarOpen(false); }}
                        className={clsx(
                          'nav-link',
                          isActive ? 'nav-link-active' : 'nav-link-inactive',
                          sidebarCollapsed && 'justify-center px-0'
                        )}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.name}</span>
                            {showChatNav && item.href === '/messages' && chatUnread > 0 && (
                              <span className="nav-badge brand-solid">
                                {chatUnread > 99 ? '99+' : chatUnread}
                              </span>
                            )}
                            {user?.role === 'admin' && item.href === '/' && expiringCount > 0 && (
                              <span className="nav-badge brand-solid">
                                {expiringCount > 99 ? '99+' : expiringCount}
                              </span>
                            )}
                            {user?.role === 'member' &&
                              item.href === '/' &&
                              memberExpiryDays != null &&
                              shouldShowExpiryAlert(memberExpiryDays, MEMBER_UI_ALERT_DAYS) && (
                                <span
                                  className={clsx('nav-badge text-white', expiryNavDotClass(memberExpiryDays))}
                                >
                                  !
                                </span>
                              )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className={clsx(
              'shrink-0 border-t border-zinc-200 dark:border-zinc-800 space-y-0.5',
              sidebarCollapsed ? 'px-0 py-2' : 'px-2.5 py-2.5'
            )}>
              <button
                type="button"
                onClick={toggleTheme}
                className={clsx('nav-link nav-link-inactive w-full', sidebarCollapsed && 'justify-center px-0')}
                title={sidebarCollapsed ? (theme === 'light' ? 'Modo oscuro' : 'Modo claro') : 'Cambiar tema'}
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0" />
                )}
                {!sidebarCollapsed && (
                  <span className="flex-1 text-left">
                    {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                  </span>
                )}
              </button>

              <Link
                to="/profile"
                onClick={() => { setIsSidebarOpen(false); }}
                className={clsx(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? user?.name : undefined}
              >
                <Avatar
                  src={profile?.profile_image}
                  name={user?.name}
                  size="sm"
                  className="shrink-0"
                />
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {ROLE_LABELS_LOCAL[user?.role ?? 'member'] ?? user?.role}
                    </p>
                  </div>
                )}
              </Link>

              <button
                type="button"
                onClick={logout}
                className={clsx(
                  'nav-link w-full text-zinc-500 dark:text-zinc-400 hover:bg-red-500/10 hover:text-red-500',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="flex-1 text-left">Cerrar sesión</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          className={clsx(
            'flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto h-dvh bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300',
            isMemberMobileShell && 'member-main-pad'
          )}
        >
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <div className="max-w-7xl mx-auto">
                <Outlet />
              </div>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>

      <OfflineBanner memberNav={isMemberMobileShell} />
      <ScrollToTop />

      {isMemberMobileShell && <MemberBottomNav />}

      {isMember && (
        <ThemeOnboarding
          open={showThemeOnboarding}
          onComplete={() => setShowThemeOnboarding(false)}
        />
      )}

      {isSidebarOpen && (
        <div
          className={clsx(
            'fixed inset-0 bg-black/50 lg:hidden',
            isMemberMobileShell ? 'z-[55]' : 'z-30'
          )}
          onClick={() => { setIsSidebarOpen(false); }}
          aria-hidden
        />
      )}
    </div>
  );
}
