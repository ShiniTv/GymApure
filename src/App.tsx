import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Payments = lazy(() => import('./pages/Payments'));
const Attendance = lazy(() => import('./pages/Attendance'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const Memberships = lazy(() => import('./pages/Memberships'));
const Routines = lazy(() => import('./pages/Routines'));
const Exercises = lazy(() => import('./pages/Exercises'));
const MemberRoutine = lazy(() => import('./pages/MemberRoutine'));
const ActiveWorkout = lazy(() => import('./pages/ActiveWorkout'));
const WorkoutHistory = lazy(() => import('./pages/WorkoutHistory'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold tracking-widest uppercase">
      Cargando...
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  
  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}

function RegisterRoute() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setAllowed(data.allowPublicRegister !== false))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return <PageLoader />;
  if (!allowed) return <Navigate to="/login" replace />;
  return <Register />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/check-in" element={<CheckIn />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="members" element={
            <ProtectedRoute allowedRoles={['admin', 'trainer']}>
              <Members />
            </ProtectedRoute>
          } />
        <Route path="attendance" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Attendance />
          </ProtectedRoute>
        } />
        <Route path="memberships" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Memberships />
          </ProtectedRoute>
        } />
        <Route path="members/:id/routines" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <MemberRoutine />
            </ProtectedRoute>
          } />
          <Route path="payments" element={
            <ProtectedRoute allowedRoles={['admin', 'member']}>
              <Payments />
            </ProtectedRoute>
          } />
          <Route path="routines" element={
            <ProtectedRoute allowedRoles={['trainer', 'member']}>
              <Routines />
            </ProtectedRoute>
          } />
          <Route path="exercises" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <Exercises />
            </ProtectedRoute>
          } />
          <Route path="workout/:id" element={
            <ProtectedRoute allowedRoles={['member']}>
              <ActiveWorkout />
            </ProtectedRoute>
          } />
          <Route path="history" element={
            <ProtectedRoute allowedRoles={['member', 'trainer']}>
              <WorkoutHistory />
            </ProtectedRoute>
          } />
          <Route path="members/:id/history" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <WorkoutHistory />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
