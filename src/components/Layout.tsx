import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
import { BRAND } from '../config/brand';
import { MobileShellProvider } from '../context/MobileShellContext';
import { LogOut, Sun, Moon, PanelLeftClose } from 'lucide-react';
import { useChatUnreadQuery } from '../hooks/queries/useChatQuery';
import clsx from 'clsx';
import { ROLE_LABELS, PORTAL_TITLES } from '../lib/roles';
import { getNavigationForRole } from '../config/navigation';
import { Avatar } from './ui';
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

const ROLE_LABELS_LOCAL = ROLE_LABELS;

const iconBtnClass =
  'inline-flex items-center justify-center h-10 w-10 rounded-full text-text-secondary hover:bg-surface-overlay transition-[background-color,transform,opacity] duration-150 touch-manipulation tap-feedback';

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

  const allFiltered = useMemo(() => getNavigationForRole(user?.role ?? 'member'), [user?.role]);

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
  const mobileHeaderTitle = currentPage ?? BRAND.name;

  const SIDEBAR_WIDTH = sidebarCollapsed ? 'w-16' : 'w-[min(88vw,17.5rem)] lg:w-60';
  const hideBackToDashboard =
    showMemberBottomNav || showReceptionBottomNav || showTrainerBottomNav || showAdminBottomNav;

  return (
    <MobileShellProvider hideBackToDashboard={hideBackToDashboard}>
      <div
        className="min-h-dvh bg-bg font-sans text-text transition-colors duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <a
          href="#main-content"
          className="focus:bg-brand sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>
        {/* Mobile Header — fixed glass island (content scrolls underneath) */}
        <div className="pointer-events-none fixed top-0 right-0 left-0 z-50 px-4 pt-3 pb-2 lg:hidden">
          <div className="mobile-chrome-glass pointer-events-auto flex h-12 items-center justify-between gap-2 rounded-card px-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo className="h-8 w-8 shrink-0" />
              <div className="min-w-0">
                {currentPage ? (
                  <>
                    <p className="truncate text-sm leading-tight font-bold tracking-[-0.02em] text-text">
                      {mobileHeaderTitle}
                    </p>
                    <p className="truncate text-[10px] leading-tight font-medium text-text-muted">
                      {BRAND.name}
                    </p>
                  </>
                ) : (
                  <BrandName variant="inline" size="sm" className="truncate leading-tight" />
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <InstallPrompt />
              <NotificationBell />
              <button
                type="button"
                onClick={toggleTheme}
                className={iconBtnClass}
                aria-label="Cambiar tema"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0">
          {/* Sidebar */}
          <aside
            className={clsx(
              'fixed top-[var(--mobile-top-chrome)] bottom-0 left-0 z-40 flex min-h-0 transform flex-col overflow-hidden bg-bg-elevated transition-[transform,width] duration-300 ease-in-out lg:static lg:inset-y-0 lg:top-0 lg:h-dvh lg:translate-x-0',
              SIDEBAR_WIDTH,
              isMobileShell && isSidebarOpen && 'z-[60]',
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}
            style={{ transitionDuration: `${SIDEBAR_MOTION_MS}ms` }}
          >
            {/* Sidebar Header */}
            {sidebarCollapsed ? (
              <div className="hidden h-16 shrink-0 items-center justify-center lg:flex">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarCollapsed(false);
                  }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-overlay"
                  aria-label="Expandir menú"
                  title="Expandir menú"
                >
                  <Logo className="pointer-events-none h-8 w-8 shrink-0" />
                </button>
              </div>
            ) : (
              <div className="hidden h-16 shrink-0 items-center gap-3 px-4 lg:flex">
                <Logo className="h-8 w-8 shrink-0" />
                <div className="overflow-hidden whitespace-nowrap transition-opacity duration-200">
                  {brandMark}
                  <p className="mt-0.5 text-[10px] font-medium tracking-[0.06em] text-text-muted">
                    {portalTitle}
                  </p>
                </div>
                <NotificationBell compact className="ml-auto" />
                <button
                  type="button"
                  onClick={() => {
                    setSidebarCollapsed(true);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay"
                  aria-label="Colapsar menú"
                  title="Colapsar menú"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="flex h-16 shrink-0 items-center gap-3 px-4 lg:hidden">
                <Logo className="h-8 w-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  {brandMark}
                  <p className="mt-0.5 text-[10px] font-medium tracking-[0.06em] text-text-muted">
                    {portalTitle}
                  </p>
                </div>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <nav
                className={clsx(
                  'nav-stack scroll-area min-h-0 flex-1 py-4 lg:py-5',
                  sidebarCollapsed ? 'px-1.5' : 'px-3'
                )}
              >
                {allFiltered.map((section) => (
                  <div key={section.name} className="nav-section">
                    {!sidebarCollapsed && (
                      <p className="nav-section-label">{section.name}</p>
                    )}
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
                              {user?.role === 'admin' &&
                                item.href === '/panel' &&
                                expiringCount > 0 && (
                                  <span className="nav-badge brand-solid">
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
                  'shrink-0 space-y-1 bg-bg/40',
                  sidebarCollapsed ? 'px-1.5 py-3' : 'px-3 py-4',
                  isReceptionMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isTrainerMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isAdminMobileShell && 'pb-[env(safe-area-inset-bottom)]',
                  isMemberMobileShell && 'pb-[env(safe-area-inset-bottom)] lg:pb-4'
                )}
              >
                {!sidebarCollapsed && (
                  <div className="hidden pb-2 lg:block">
                    <InstallPrompt />
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="hidden justify-center pb-2 lg:flex">
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
                  onClick={() => {
                    setIsSidebarOpen(false);
                  }}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-overlay',
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
                      <p className="truncate text-sm font-medium leading-snug text-text">
                        {user?.name}
                      </p>
                      <p className="mt-1 truncate text-[10px] font-medium tracking-[0.04em] text-text-muted">
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
              'h-dvh min-w-0 flex-1 overflow-x-clip overflow-y-auto bg-bg p-4 transition-colors duration-300 sm:p-6 lg:p-8',
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
