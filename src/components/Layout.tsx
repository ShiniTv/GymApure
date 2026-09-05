import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useProfileQuery } from '../hooks/queries/useProfileQuery';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useTheme } from '../context/ThemeContext';
import { expiryNavDotClass, MEMBER_UI_ALERT_DAYS, shouldShowExpiryAlert } from '../lib/expiryUtils';
import Logo from './Logo';
import BrandName from './BrandName';
import { ScrollToTop } from './ScrollToTop';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import { MobileShellProvider } from '../context/MobileShellContext';
import { LogOut, Sun, Moon, PanelLeftClose } from 'lucide-react';
import { useChatUnreadQuery } from '../hooks/queries/useChatQuery';
import { useTrainerInvoicesQuery } from '../hooks/queries/useTrainerBillingQuery';
import clsx from 'clsx';
import { ROLE_LABELS, PORTAL_TITLES, getDefaultRouteForRole } from '../lib/roles';
import { getNavigationForRole } from '../config/navigation';
import { Avatar, IconButton } from './ui';
import { MemberBottomNav } from './member/MemberBottomNav';
import { ReceptionBottomNav } from './reception/ReceptionBottomNav';
import { TrainerBottomNav } from './trainer/TrainerBottomNav';
import { AdminBottomNav } from './admin/AdminBottomNav';
import { shouldHideMemberBottomNav } from '../config/navigation/memberBottomNav';
import { ThemeOnboarding } from './member/ThemeOnboarding';
import { THEME_ONBOARDING_KEY } from '../config/themes';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useScrollLock } from '../hooks/useScrollLock';
import { LogoutConfirmModal, useLogoutConfirm } from './LogoutConfirmModal';
import { NotificationBell } from './notifications/NotificationBell';
import { useAppFonts } from '../hooks/useAppFonts';
import { routePrefetchHandlers } from '../lib/routePrefetch';
import { CommandPalette, useCommandPaletteShortcut } from './CommandPalette';

const ROLE_LABELS_LOCAL = ROLE_LABELS;

const SIDEBAR_MOTION_MS = 300;

export default function Layout() {
  useAppFonts();
  const { user } = useAuth();
  const { requestLogout: openLogoutConfirm, logoutConfirmProps } = useLogoutConfirm();
  const requestLogout = useCallback(() => {
    setIsSidebarOpen(false);
    openLogoutConfirm();
  }, [openLogoutConfirm]);
  const { data: profile } = useProfileQuery(user?.id);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarBackdropMounted, setSidebarBackdropMounted] = useState(false);
  const [sidebarBackdropVisible, setSidebarBackdropVisible] = useState(false);
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
  const isReceptionist = user?.role === 'receptionist';
  const isTrainer = user?.role === 'trainer';
  const isAdmin = user?.role === 'admin';
  const { data: trainerInvoices = [] } = useTrainerInvoicesQuery(isTrainer);
  const ptConfirmCount = useMemo(
    () =>
      trainerInvoices.filter((inv) => inv.status === 'pending' && Boolean(inv.reference)).length,
    [trainerInvoices]
  );
  const { isMobileShell: isBelowDesktopShell } = useBreakpoint();
  const isMemberMobileShell = isMember && isBelowDesktopShell;
  const isReceptionMobileShell = isReceptionist && isBelowDesktopShell;
  const isTrainerMobileShell = isTrainer && isBelowDesktopShell;
  const isAdminMobileShell = isAdmin && isBelowDesktopShell;
  const isMobileShell =
    isMemberMobileShell || isReceptionMobileShell || isTrainerMobileShell || isAdminMobileShell;
  const hideMemberBottomNav = shouldHideMemberBottomNav(location.pathname);
  const showMemberBottomNav = isMemberMobileShell && !hideMemberBottomNav;
  const showReceptionBottomNav = isReceptionMobileShell && !isSidebarOpen;
  const showTrainerBottomNav = isTrainerMobileShell && !isSidebarOpen;
  const showAdminBottomNav = isAdminMobileShell && !isSidebarOpen;
  /** Bottom-nav shells use Más + swipe; never show hamburger on mobile */
  const useMobileNavLinks = isMobileShell;
  const [showThemeOnboarding, setShowThemeOnboarding] = useState(false);

  const toggleCommandPalette = useCallback(() => {
    setCommandOpen((v) => !v);
  }, []);
  useCommandPaletteShortcut(toggleCommandPalette);

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
      if (path === '/members' && location.search.includes('focus=')) return false;
      return true;
    }
    const expected = new URLSearchParams(search);
    const current = new URLSearchParams(location.search);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return true;
  };

  const allFiltered = useMemo(() => {
    const nav = getNavigationForRole(user?.role ?? 'member');
    if (user?.role !== 'member') return nav;
    const showPt = memberStats?.stats?.showPtBilling === true;
    if (showPt) return nav;
    return nav.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.href !== '/pt-billing'),
    }));
  }, [user?.role, memberStats?.stats?.showPtBilling]);

  const portalTitle = PORTAL_TITLES[user?.role ?? 'member'];

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

  useScrollLock(isSidebarOpen);

  useEffect(() => {
    if (isSidebarOpen) {
      setSidebarBackdropMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSidebarBackdropVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setSidebarBackdropVisible(false);
    const timer = window.setTimeout(() => setSidebarBackdropMounted(false), SIDEBAR_MOTION_MS);
    return () => window.clearTimeout(timer);
  }, [isSidebarOpen]);

  const brandMark = <BrandName variant="split" />;
  const homeHref = getDefaultRouteForRole(user?.role ?? 'member');

  const goHome = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const SIDEBAR_WIDTH = sidebarCollapsed ? 'w-16' : 'w-[min(88vw,16rem)] lg:w-56';
  const hideBackToDashboard =
    showMemberBottomNav || showReceptionBottomNav || showTrainerBottomNav || showAdminBottomNav;

  return (
    <MobileShellProvider hideBackToDashboard={hideBackToDashboard}>
      <div
        className="bg-bg text-text min-h-dvh font-sans transition-colors duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <a
          href="#main-content"
          className="focus:bg-brand sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>

        <div className="flex min-h-0">
          {/* Sidebar — Apple Operate elevated panel */}
          <aside
            className={clsx(
              'app-sidebar border-border/60 fixed inset-y-0 left-0 z-40 flex min-h-0 transform flex-col overflow-hidden border-r transition-[transform,width] duration-300 ease-in-out lg:static lg:h-dvh lg:translate-x-0',
              SIDEBAR_WIDTH,
              isMobileShell && isSidebarOpen && 'z-[60]',
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}
            style={{ transitionDuration: `${SIDEBAR_MOTION_MS}ms` }}
          >
            {/* Sidebar Header */}
            {sidebarCollapsed ? (
              <div className="border-border/40 hidden h-14 shrink-0 items-center justify-center border-b lg:flex">
                <Link
                  to={homeHref}
                  onClick={() => {
                    setSidebarCollapsed(false);
                  }}
                  className="text-text-secondary hover:bg-surface-overlay flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-input)] transition-colors"
                  aria-label="Ir al inicio"
                  title="Ir al inicio"
                >
                  <Logo className="pointer-events-none h-7 w-7 shrink-0" />
                </Link>
              </div>
            ) : (
              <div className="border-border/40 hidden h-14 shrink-0 items-center gap-2.5 border-b px-3 lg:flex">
                <Link
                  to={homeHref}
                  onClick={goHome}
                  className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-[var(--radius-input)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-brand)_45%,transparent)]"
                  aria-label="Ir al inicio"
                  title="Ir al inicio"
                >
                  <Logo className="h-7 w-7 shrink-0" />
                  <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-200">
                    {brandMark}
                    <p className="text-text-muted text-small mt-0.5 truncate font-medium tracking-[-0.01em]">
                      {currentPage ?? portalTitle}
                    </p>
                  </div>
                </Link>
                <NotificationBell compact className="shrink-0" />
                <IconButton
                  type="button"
                  size="sm"
                  variant="tertiary"
                  onClick={() => {
                    setSidebarCollapsed(true);
                  }}
                  aria-label="Colapsar menú"
                  title="Colapsar menú"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="border-border/40 flex h-14 shrink-0 items-center gap-2.5 border-b px-3 lg:hidden">
                <Link
                  to={homeHref}
                  onClick={goHome}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-input)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-brand)_45%,transparent)]"
                  aria-label="Ir al inicio"
                  title="Ir al inicio"
                >
                  <Logo className="h-7 w-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {brandMark}
                    <p className="text-text-muted text-small mt-0.5 truncate font-medium tracking-[-0.01em]">
                      {currentPage ?? portalTitle}
                    </p>
                  </div>
                </Link>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <nav
                className={clsx(
                  'nav-stack scroll-area min-h-0 flex-1 py-2.5 lg:py-3',
                  sidebarCollapsed ? 'px-1.5' : 'px-2'
                )}
              >
                {allFiltered.map((section) => (
                  <div key={section.name} className="nav-section">
                    {!sidebarCollapsed && <p className="nav-section-label">{section.name}</p>}
                    {section.items.map((item) => {
                      const isActive = isNavActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          {...routePrefetchHandlers(item.href)}
                          onClick={() => {
                            setIsSidebarOpen(false);
                          }}
                          className={clsx(
                            'nav-link',
                            useMobileNavLinks && 'nav-link-mobile',
                            isActive ? 'nav-link-active' : 'nav-link-inactive',
                            sidebarCollapsed && 'justify-center px-0'
                          )}
                          title={sidebarCollapsed ? item.name : undefined}
                          aria-label={sidebarCollapsed ? item.name : undefined}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <item.icon
                            className={clsx(
                              'h-4 w-4 shrink-0',
                              isActive ? 'text-text' : 'text-text-muted'
                            )}
                          />
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1 truncate">{item.name}</span>
                              {showChatNav && item.href === '/messages' && chatUnread > 0 && (
                                <span className="nav-badge nav-badge-soft">
                                  {chatUnread > 99 ? '99+' : chatUnread}
                                </span>
                              )}
                              {isTrainer && item.href === '/pt-billing' && ptConfirmCount > 0 && (
                                <span className="nav-badge nav-badge-soft">
                                  {ptConfirmCount > 99 ? '99+' : ptConfirmCount}
                                </span>
                              )}
                              {user?.role === 'admin' &&
                                item.href === '/panel' &&
                                expiringCount > 0 && (
                                  <span className="nav-badge nav-badge-soft">
                                    {expiringCount > 99 ? '99+' : expiringCount}
                                  </span>
                                )}
                              {user?.role === 'member' &&
                                item.href === '/panel' &&
                                memberExpiryDays != null &&
                                shouldShowExpiryAlert(memberExpiryDays, MEMBER_UI_ALERT_DAYS) && (
                                  <span
                                    className={clsx(
                                      'nav-badge text-white',
                                      expiryNavDotClass(memberExpiryDays)
                                    )}
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

              <div
                className={clsx(
                  'border-border/40 shrink-0 space-y-0.5 border-t',
                  sidebarCollapsed ? 'px-1.5 py-2.5' : 'px-2 py-2.5',
                  isReceptionMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isTrainerMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isAdminMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isMemberMobileShell && 'pb-[env(safe-area-inset-bottom)] lg:pb-2.5'
                )}
              >
                {!sidebarCollapsed && (
                  <div className="hidden pb-1.5 lg:block">
                    <InstallPrompt />
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="hidden justify-center pb-1.5 lg:flex">
                    <NotificationBell compact />
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={clsx(
                    'nav-link nav-link-inactive w-full',
                    sidebarCollapsed && 'justify-center px-0'
                  )}
                  title={
                    sidebarCollapsed
                      ? theme === 'light'
                        ? 'Modo oscuro'
                        : 'Modo claro'
                      : 'Cambiar tema'
                  }
                >
                  {theme === 'light' ? (
                    <Moon className="text-text-muted h-4 w-4 shrink-0" />
                  ) : (
                    <Sun className="text-text-muted h-4 w-4 shrink-0" />
                  )}
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left">
                      {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                    </span>
                  )}
                </button>

                <Link
                  to="/profile"
                  onClick={() => {
                    setIsSidebarOpen(false);
                  }}
                  className={clsx(
                    'hover:bg-surface-overlay/70 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors',
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
                      <p className="text-text text-chrome truncate leading-snug font-medium">
                        {user?.name}
                      </p>
                      <p className="text-text-muted text-small mt-0.5 truncate font-medium tracking-[-0.008em]">
                        {ROLE_LABELS_LOCAL[user?.role ?? 'member'] ?? user?.role}
                      </p>
                    </div>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={requestLogout}
                  className={clsx(
                    'nav-link text-text-secondary hover:bg-danger/10 hover:text-danger w-full',
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
              'app-canvas px-ds-4 py-ds-3 sm:p-ds-4 lg:p-ds-5 h-dvh min-w-0 flex-1 overflow-x-clip overflow-y-auto transition-colors duration-300',
              isMobileShell && 'mobile-top-pad',
              isMemberMobileShell && !hideMemberBottomNav && 'member-main-pad',
              isReceptionMobileShell && 'reception-main-pad',
              isTrainerMobileShell && 'trainer-main-pad',
              isAdminMobileShell && 'admin-main-pad'
            )}
          >
            <div key={location.pathname} className="animate-page-enter mx-auto max-w-7xl min-w-0">
              <Outlet />
            </div>
          </main>
        </div>

        <OfflineBanner
          aboveBottomNav={
            isMemberMobileShell ||
            isReceptionMobileShell ||
            isTrainerMobileShell ||
            isAdminMobileShell
          }
        />
        <ScrollToTop />

        {showMemberBottomNav && <MemberBottomNav />}
        {showReceptionBottomNav && <ReceptionBottomNav />}
        {showTrainerBottomNav && <TrainerBottomNav />}
        {showAdminBottomNav && <AdminBottomNav />}

        <LogoutConfirmModal {...logoutConfirmProps} />

        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

        {isMember && (
          <ThemeOnboarding
            open={showThemeOnboarding}
            onComplete={() => {
              setShowThemeOnboarding(false);
            }}
          />
        )}

        {sidebarBackdropMounted && (
          <button
            type="button"
            className={clsx(
              'fixed inset-0 bg-black/50 transition-opacity ease-in-out lg:hidden',
              isMobileShell ? 'z-[55]' : 'z-30',
              sidebarBackdropVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transitionDuration: `${SIDEBAR_MOTION_MS}ms` }}
            onClick={() => {
              setIsSidebarOpen(false);
            }}
            aria-label="Cerrar menú lateral"
          />
        )}
      </div>
    </MobileShellProvider>
  );
}
