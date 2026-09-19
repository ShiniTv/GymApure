import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useProfileQuery } from '../hooks/queries/useProfileQuery';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useTheme } from '../context/ThemeContext';
import { expiryNavDotClass, MEMBER_UI_ALERT_DAYS, shouldShowExpiryAlert } from '../lib/expiryUtils';
import Logo from './Logo';
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
              isMobileShell && isSidebarOpen && 'z-[60] shadow-[var(--shadow-sheet)]',
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}
            style={{ transitionDuration: `${SIDEBAR_MOTION_MS}ms` }}
            aria-label="Navegación principal"
          >
            {/* Sidebar Header */}
            {sidebarCollapsed ? (
              <div className="border-border/50 hidden h-16 shrink-0 flex-col items-center justify-center gap-1 border-b lg:flex">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="hover:bg-surface-overlay/80 text-text-muted hover:text-text flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all"
                  aria-label="Expandir menú lateral"
                  title="Expandir menú lateral"
                >
                  <Logo className="pointer-events-none h-7 w-7 shrink-0" />
                </button>
              </div>
            ) : (
              <div className="border-border/50 hidden h-16 shrink-0 items-center justify-between gap-2 border-b px-3 lg:flex">
                <Link
                  to={homeHref}
                  onClick={goHome}
                  className="group hover:bg-surface-overlay/40 -m-1 flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-xl p-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-brand)_45%,transparent)]"
                  aria-label="Ir al inicio"
                  title="Ir al inicio"
                >
                  <Logo className="h-8 w-8 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-1 leading-tight">
                      <span className="text-text text-sm font-bold tracking-tight">Gym</span>
                      <span className="text-brand text-sm font-bold tracking-tight">Apure</span>
                    </div>
                    <p className="text-text-muted mt-0.5 truncate text-xs leading-none font-medium tracking-tight">
                      {currentPage ?? portalTitle}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-0.5">
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
                    className="text-text-muted hover:text-text"
                  >
                    <PanelLeftClose className="operate-icon h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="border-border/50 flex h-16 shrink-0 items-center gap-2.5 border-b px-3.5 lg:hidden">
                <Link
                  to={homeHref}
                  onClick={goHome}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-brand)_45%,transparent)]"
                  aria-label="Ir al inicio"
                  title="Ir al inicio"
                >
                  <Logo className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 leading-tight">
                      <span className="text-text text-sm font-bold tracking-tight">Gym</span>
                      <span className="text-brand text-sm font-bold tracking-tight">Apure</span>
                    </div>
                    <p className="text-text-muted mt-0.5 truncate text-xs leading-none font-medium tracking-tight">
                      {currentPage ?? portalTitle}
                    </p>
                  </div>
                </Link>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <nav
                className={clsx(
                  'min-h-0 flex-1 py-2',
                  sidebarCollapsed
                    ? 'scroll-area-collapsed flex flex-col items-center px-1.5'
                    : 'scroll-area px-2'
                )}
              >
                {allFiltered.map((section, sectionIdx) => (
                  <div
                    key={section.name}
                    className={clsx(
                      sidebarCollapsed ? 'mb-1 flex w-full flex-col items-center' : 'nav-section'
                    )}
                  >
                    {sidebarCollapsed ? (
                      sectionIdx > 0 && (
                        <div className="bg-border/50 my-1.5 h-px w-6 shrink-0" aria-hidden />
                      )
                    ) : (
                      <p className="nav-section-label">{section.name}</p>
                    )}
                    <div
                      className={clsx(
                        'flex w-full flex-col',
                        sidebarCollapsed ? 'items-center gap-1' : 'gap-0.5'
                      )}
                    >
                      {section.items.map((item) => {
                        const isActive = isNavActive(item.href);
                        const hasBadge =
                          (showChatNav && item.href === '/messages' && chatUnread > 0) ||
                          (isTrainer && item.href === '/pt-billing' && ptConfirmCount > 0) ||
                          (user?.role === 'admin' && item.href === '/panel' && expiringCount > 0) ||
                          (user?.role === 'member' &&
                            item.href === '/panel' &&
                            memberExpiryDays != null &&
                            shouldShowExpiryAlert(memberExpiryDays, MEMBER_UI_ALERT_DAYS));

                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            {...routePrefetchHandlers(item.href)}
                            onClick={() => {
                              setIsSidebarOpen(false);
                            }}
                            className={clsx(
                              'nav-link group',
                              !sidebarCollapsed && useMobileNavLinks && 'nav-link-mobile',
                              isActive ? 'nav-link-active' : 'nav-link-inactive',
                              sidebarCollapsed &&
                                'relative mx-auto flex !h-9 !min-h-0 !w-9 items-center justify-center !gap-0 !rounded-xl !p-0'
                            )}
                            title={sidebarCollapsed ? item.name : undefined}
                            aria-label={sidebarCollapsed ? item.name : undefined}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <item.icon
                              className={clsx(
                                'operate-icon h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105',
                                isActive ? 'text-brand' : 'text-text-muted group-hover:text-text'
                              )}
                              strokeWidth={isActive ? 2 : 1.75}
                            />
                            {sidebarCollapsed ? (
                              hasBadge && (
                                <span className="absolute top-1 right-1 flex h-2 w-2">
                                  <span className="bg-brand absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                                  <span className="bg-brand relative inline-flex h-2 w-2 rounded-full"></span>
                                </span>
                              )
                            ) : (
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
                  </div>
                ))}
              </nav>

              <div
                className={clsx(
                  'border-border/50 shrink-0 border-t',
                  sidebarCollapsed
                    ? 'flex flex-col items-center gap-1.5 px-1.5 py-2.5'
                    : 'space-y-1 px-2 py-2',
                  isReceptionMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isTrainerMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isAdminMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isMemberMobileShell && 'pb-[env(safe-area-inset-bottom)] lg:pb-2'
                )}
              >
                {!sidebarCollapsed && (
                  <div className="hidden pb-1 lg:block">
                    <InstallPrompt />
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="hidden justify-center lg:flex">
                    <NotificationBell compact className="!h-9 !w-9 !rounded-xl" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={clsx(
                    'nav-link nav-link-inactive group',
                    sidebarCollapsed
                      ? 'mx-auto flex !h-9 !min-h-0 !w-9 items-center justify-center !gap-0 !rounded-xl !p-0'
                      : 'w-full'
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
                    <Moon
                      className="operate-icon text-text-muted group-hover:text-text h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Sun
                      className="operate-icon text-text-muted group-hover:text-text h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105"
                      strokeWidth={1.75}
                    />
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
                    sidebarCollapsed
                      ? 'nav-link group mx-auto flex !h-9 !min-h-0 !w-9 items-center justify-center !gap-0 !rounded-xl !p-0'
                      : 'nav-user-card',
                    isNavActive('/profile') && !sidebarCollapsed && 'ring-border/70 ring-1',
                    isNavActive('/profile') && sidebarCollapsed && 'nav-link-active !text-brand',
                    !isNavActive('/profile') && sidebarCollapsed && 'nav-link-inactive'
                  )}
                  title={sidebarCollapsed ? user?.name : undefined}
                  aria-current={isNavActive('/profile') ? 'page' : undefined}
                >
                  <Avatar
                    src={profile?.profile_image}
                    name={user?.name}
                    size="sm"
                    className={clsx(
                      'shrink-0 transition-transform duration-150 group-hover:scale-105',
                      sidebarCollapsed && '!h-7 !w-7 text-xs'
                    )}
                  />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-text text-chrome truncate leading-snug font-semibold tracking-[-0.01em]">
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
                    'nav-link nav-link-danger group',
                    sidebarCollapsed
                      ? 'mx-auto flex !h-9 !min-h-0 !w-9 items-center justify-center !gap-0 !rounded-xl !p-0'
                      : 'w-full'
                  )}
                  title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
                >
                  <LogOut
                    className="operate-icon h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105"
                    strokeWidth={1.75}
                  />
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
              'fixed inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity ease-in-out lg:hidden dark:bg-black/70',
              isMobileShell ? 'z-[55]' : 'z-30',
              sidebarBackdropVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              transitionDuration: `${SIDEBAR_MOTION_MS}ms`,
              transitionTimingFunction: 'var(--ease-drawer)',
            }}
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
