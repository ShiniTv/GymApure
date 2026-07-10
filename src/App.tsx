import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AdminStatsProvider } from './context/AdminStatsContext';
import { MemberStatsProvider } from './context/MemberStatsContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProgressBar } from './components/ProgressBar';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import { getDefaultRouteForRole } from './lib/roles';

function reportBoundaryError(error: Error) {
  void import('@sentry/react')
    .then((Sentry) => {
      Sentry.captureException(error);
    })
    .catch(() => {
      /* Sentry not configured */
    });
}

const CheckIn = lazy(() => import('./pages/CheckIn'));

const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Payments = lazy(() => import('./pages/Payments'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Memberships = lazy(() => import('./pages/Memberships'));
const Routines = lazy(() => import('./pages/Routines'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Trainers = lazy(() => import('./pages/Trainers'));
const MemberRoutine = lazy(() => import('./pages/MemberRoutine'));
const ActiveWorkout = lazy(() => import('./pages/ActiveWorkout'));
const WorkoutHistory = lazy(() => import('./pages/WorkoutHistory'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const MemberNutrition = lazy(() => import('./pages/member/MemberNutrition'));
const NutritionOverview = lazy(() => import('./pages/NutritionOverview'));
const Profile = lazy(() => import('./pages/Profile'));
const Reports = lazy(() => import('./pages/Reports'));
const Messages = lazy(() => import('./pages/Messages'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Settings = lazy(() => import('./pages/Settings'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const Reception = lazy(() => import('./pages/Reception'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const Landing = lazy(() => import('./pages/Landing'));
const DemoRequest = lazy(() => import('./pages/DemoRequest'));

function PageLoader() {
  return (
    <div className="flex h-dvh items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-[11px] font-bold tracking-[0.15em] text-zinc-400 uppercase dark:text-zinc-500">
          Cargando...
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function RegisterRoute() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: { allowPublicRegister?: boolean }) => {
        setAllowed(data.allowPublicRegister !== false);
      })
      .catch(() => {
        setAllowed(false);
      });
  }, []);

  if (allowed === null) return <PageLoader />;
  if (!allowed) return <Navigate to="/login" replace />;
  return <Register />;
}

function LandingRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  return <Landing />;
}

function DemoRequestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  return <DemoRequest />;
}

function AppRoutes() {
  return (
    <ErrorBoundary
      onError={(error) => {
        reportBoundaryError(error);
      }}
    >
      <ProgressBar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/solicitar-demo" element={<DemoRequestRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<RegisterRoute />} />
          <Route
            path="/check-in"
            element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <ErrorBoundary
                  onError={(error) => {
                    reportBoundaryError(error);
                  }}
                >
                  <CheckIn />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AdminStatsProvider>
                  <MemberStatsProvider>
                    <ErrorBoundary
                      onError={(error) => {
                        reportBoundaryError(error);
                      }}
                    >
                      <Layout />
                    </ErrorBoundary>
                  </MemberStatsProvider>
                </AdminStatsProvider>
              </ProtectedRoute>
            }
          >
            <Route
              path="panel"
              element={
                <ErrorBoundary
                  onError={(error) => {
                    reportBoundaryError(error);
                  }}
                >
                  <Dashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="access-denied"
              element={
                <ErrorBoundary
                  onError={(error) => {
                    reportBoundaryError(error);
                  }}
                >
                  <AccessDenied />
                </ErrorBoundary>
              }
            />
            <Route
              path="members"
              element={
                <ProtectedRoute allowedRoles={['admin', 'trainer', 'receptionist']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Members />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="reception"
              element={
                <ProtectedRoute allowedRoles={['receptionist']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Reception />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Attendance />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="memberships"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Memberships />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="trainers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Trainers />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <AuditLogs />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Reports />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="equipment"
              element={
                <ProtectedRoute allowedRoles={['admin', 'trainer', 'receptionist']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Equipment />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Settings />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="messages"
              element={
                <ProtectedRoute allowedRoles={['admin', 'trainer', 'receptionist', 'member']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Messages />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <NotificationsPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="members/:id/routines"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <MemberRoutine />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute allowedRoles={['admin', 'member', 'receptionist']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Payments />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="routines"
              element={
                <ProtectedRoute allowedRoles={['trainer', 'member']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Routines />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="exercises"
              element={
                <ProtectedRoute allowedRoles={['trainer', 'member']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Exercises />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="nutrition-overview"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <NutritionOverview />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="workout/:id"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <ActiveWorkout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="history"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <WorkoutHistory />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="nutrition"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <Nutrition />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ErrorBoundary
                  onError={(error) => {
                    reportBoundaryError(error);
                  }}
                >
                  <Profile />
                </ErrorBoundary>
              }
            />
            <Route
              path="members/:id/nutrition"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <MemberNutrition />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="members/:id/history"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ErrorBoundary
                    onError={(error) => {
                      reportBoundaryError(error);
                    }}
                  >
                    <WorkoutHistory />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <AppRoutes />
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
