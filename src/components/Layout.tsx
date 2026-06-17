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
  Settings2,
} from 'lucide-react';
import clsx from 'clsx';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  trainer: 'Entrenador',
  member: 'Miembro',
};

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
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'trainer', 'member'] },
    { name: 'Miembros', href: '/members', icon: Users, roles: ['admin', 'trainer'] },
    { name: 'Membresías', href: '/memberships', icon: CreditCard, roles: ['admin'] },
    { name: 'Auditoría', href: '/audit-logs', icon: ScrollText, roles: ['admin'] },
    { name: 'Asistencias', href: '/attendance', icon: BarChart2, roles: ['admin'] },
    { name: 'Reportes', href: '/reports', icon: FileSpreadsheet, roles: ['admin'] },
    { name: 'Configuración', href: '/settings', icon: Settings2, roles: ['admin'] },
    { name: 'Pagos', href: '/payments', icon: CreditCard, roles: ['admin', 'member'] },
    { name: 'Rutinas', href: '/routines', icon: Dumbbell, roles: ['trainer', 'member'] },
    { name: 'Biblioteca', href: '/exercises', icon: BookOpen, roles: ['trainer'] },
    { name: 'Historial', href: '/history', icon: History, roles: ['member', 'trainer'] },
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle, roles: ['admin', 'trainer', 'member'] },
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-bold text-lg tracking-tight uppercase">Caribean Gym</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400 hover:text-white">
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-200 dark:border-zinc-800">
            <Logo className="h-10 w-10" />
            <span className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-[0.8]">
              Caribean<br/>
              <span className="text-orange-500 text-xs tracking-[0.2em] font-black not-italic">GYM</span>
            </span>
          </div>

          <div className="flex flex-col justify-between h-[calc(100vh-4rem)] p-4">
            <nav className="space-y-1">
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-500" 
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.name}</span>
                    {user?.role === 'admin' && item.href === '/' && expiringCount > 0 && (
                      <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-black">
                        {expiringCount > 99 ? '99+' : expiringCount}
                      </span>
                    )}
                    {user?.role === 'member' && item.href === '/' && memberExpiryDays != null && shouldShowExpiryAlert(memberExpiryDays, MEMBER_UI_ALERT_DAYS) && (
                      <span className={`min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-white text-[10px] font-black ${expiryNavDotClass(memberExpiryDays)}`}>
                        !
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
              <button 
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                title="Cambiar Tema"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="h-5 w-5" />
                    Modo Oscuro
                  </>
                ) : (
                  <>
                    <Sun className="h-5 w-5" />
                    Modo Claro
                  </>
                )}
              </button>

              <div className="px-3 py-2">
                <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">{user?.name}</p>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mt-1">
                  {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
