import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useTheme } from '../context/ThemeContext';
import {
  expiryNavDotClass,
  MEMBER_UI_ALERT_DAYS,
  shouldShowExpiryAlert,
} from '../lib/expiryUtils';
import Logo from './Logo';
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
} from 'lucide-react';
import clsx from 'clsx';
import { ROLE_LABELS } from '../lib/roles';

const ROLE_LABELS_LOCAL = ROLE_LABELS;

const iconBtnClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const expiringCount = adminStats?.expiringSoon ?? 0;
  const memberExpiryDays = memberStats?.stats?.subscription?.days_remaining ?? null;

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'trainer', 'member', 'receptionist'] },
    { name: 'Recepción', href: '/reception', icon: Fingerprint, roles: ['admin', 'receptionist'] },
    { name: 'Miembros', href: '/members', icon: Users, roles: ['admin', 'trainer', 'receptionist'] },
    { name: 'Membresías', href: '/memberships', icon: CreditCard, roles: ['admin'] },
    { name: 'Auditoría', href: '/audit-logs', icon: ScrollText, roles: ['admin'] },
    { name: 'Asistencias', href: '/attendance', icon: BarChart2, roles: ['admin'] },
    { name: 'Reportes', href: '/reports', icon: FileSpreadsheet, roles: ['admin'] },
    { name: 'Configuración', href: '/settings', icon: Settings2, roles: ['admin'] },
    { name: 'Pagos', href: '/payments', icon: CreditCard, roles: ['admin', 'member', 'receptionist'] },
    { name: 'Rutinas', href: '/routines', icon: Dumbbell, roles: ['trainer', 'member'] },
    { name: 'Asignaciones', href: '/routines?view=assignments', icon: CalendarClock, roles: ['trainer'] },
    { name: 'Ejercicios', href: '/exercises', icon: BookOpen, roles: ['trainer'] },
    { name: 'Historial', href: '/history', icon: History, roles: ['member'] },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle, roles: ['admin', 'trainer', 'member', 'receptionist'] },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(user?.role || ''));

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

  const currentPage = filteredNav.find((item) => isNavActive(item.href))?.name;

  const brandMark = (
    <span className="flex flex-col leading-none min-w-0">
      <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white truncate">
        Caribean
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-500 -mt-px truncate">
        Gym
      </span>
    </span>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between gap-2 px-3 h-12 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 min-w-0">
          <Logo className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            {brandMark}
            {currentPage && (
              <p className="text-[10px] font-medium text-zinc-400 truncate mt-0.5 leading-tight">
                {currentPage}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={toggleTheme} className={iconBtnClass} aria-label="Cambiar tema">
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
            'fixed top-12 bottom-0 left-0 z-40 w-60 transform bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-200 ease-in-out lg:top-0 lg:inset-y-0 lg:static lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="hidden lg:flex h-14 items-center gap-2.5 px-3 border-b border-zinc-200 dark:border-zinc-800">
            <Logo className="h-8 w-8 shrink-0" />
            {brandMark}
          </div>

          <div className="flex flex-col h-full lg:h-[calc(100vh-3.5rem)]">
            <nav className="nav-stack flex-1 min-h-0 scroll-area px-2.5 py-2.5 lg:py-3">
              {filteredNav.map((item) => {
                const isActive = isNavActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={clsx('nav-link', isActive ? 'nav-link-active' : 'nav-link-inactive')}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.name}</span>
                    {user?.role === 'admin' && item.href === '/' && expiringCount > 0 && (
                      <span className="nav-badge bg-orange-500 text-white">
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
                  </Link>
                );
              })}
            </nav>

            <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-2.5 py-2.5 space-y-0.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="nav-link nav-link-inactive w-full"
                title="Cambiar tema"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Modo oscuro</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Modo claro</span>
                  </>
                )}
              </button>

              <div className="px-2.5 py-1.5">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] font-medium text-zinc-500 truncate mt-0.5">
                  {ROLE_LABELS_LOCAL[user?.role ?? 'member'] ?? user?.role}
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="nav-link w-full text-zinc-500 dark:text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
          <div key={location.pathname} className="max-w-7xl mx-auto page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
