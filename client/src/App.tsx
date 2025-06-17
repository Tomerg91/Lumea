import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import usePageTracking from './hooks/usePageTracking';
import { usePWA } from './hooks/usePWA';
import Navigation from './components/Navigation';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './App.css';

// Implement more aggressive lazy loading - only load what's needed
const HomePage = lazy(() => import('./pages/Index'));
const AuthPage = lazy(() => import('./pages/Auth'));

// Dashboard components - load on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientsPage = lazy(() => import('./pages/Dashboard/ClientsPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const SessionDetail = lazy(() => import('./pages/SessionDetail'));
const ReflectionsPage = lazy(() => import('./pages/ReflectionsPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

// Admin components - only load for admin users
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Development/testing components - only load in development or when needed
const TestPage = lazy(() => import('./pages/Test'));
const DebugPage = lazy(() => import('./pages/Debug'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystem'));

// Demo components - load only when specifically accessed
const RichTextEditorDemo = lazy(() => 
  import('./components/RichTextEditorDemo').then(module => ({ default: module.RichTextEditorDemo }))
);
const ReflectionDemo = lazy(() => import('./pages/ReflectionDemo'));
const AudioRecorderDemo = lazy(() => import('./components/audio/AudioRecorderDemo'));
const AudioReflectionTest = lazy(() => 
  import('./components/audio/AudioReflectionTest').then(module => ({ default: module.AudioReflectionTest }))
);
const MobileAudioTest = lazy(() => 
  import('./components/audio/MobileAudioTest').then(module => ({ default: module.MobileAudioTest }))
);
const NotesDemo = lazy(() => 
  import('./components/notes/NotesDemo').then(module => ({ default: module.NotesDemo }))
);
const HIPAAComplianceDashboard = lazy(() => import('./components/analytics/HIPAAComplianceDashboard'));

// Utility pages
const Offline = lazy(() => import('./pages/Offline'));
const CalendarCallback = lazy(() => 
  import('./components/calendar/CalendarCallback').then(module => ({ default: module.CalendarCallback }))
);
const BookingPage = lazy(() => import('./pages/BookingPage'));

// Optimized loading component - lighter and faster
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center shadow-lg">
      <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
      </div>
      <p className="text-lg font-medium text-gray-700">טוען... / Loading...</p>
    </div>
  </div>
);

// Minimal loading for navigation changes
const MinimalLoader = () => (
  <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500 animate-pulse z-50"></div>
);

// Enhanced Protected Route component with better loading states
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <MinimalLoader />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Role-based Route component with optimized error handling
const RoleProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <MinimalLoader />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile?.role || !allowedRoles.includes(profile.role as string)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto text-center shadow-lg">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Access Denied / אין הרשאה
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. / אין לך הרשאה לגשת לדף זה.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Go Back / חזור
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Layout component with Navigation
const Layout = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <Navigation />
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
);

// Public layout for pages that don't need navigation
const PublicLayout = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <Outlet />
  </div>
);

// 404 Not Found component - optimized
const NotFound = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto text-center shadow-lg">
      <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl">🔍</span>
      </div>
      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">404</h1>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Page Not Found / דף לא נמצא
      </h2>
      <p className="text-gray-600 mb-6">
        The page you're looking for doesn't exist. / הדף שאתה מחפש לא קיים.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200"
      >
        Go Home / עבור לעמוד הבית
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  usePageTracking();
  const { isOffline } = usePWA();

  return (
    <div className="App">
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        
        {/* Offline indicator - optimized */}
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm font-medium z-50 shadow-lg">
            You are currently offline. Some features may be limited.
          </div>
        )}
        
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes with Navigation */}
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
            </Route>

            {/* Public routes without Navigation */}
            <Route element={<PublicLayout />}>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/offline" element={<Offline />} />
              <Route path="/calendar/callback" element={<CalendarCallback />} />
              <Route path="/book/:coachId" element={<BookingPage />} />
            </Route>

            {/* Protected Coach Routes */}
            <Route element={<Layout />}>
              <Route 
                path="/coach/dashboard" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <Dashboard />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/clients" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <ClientsPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/sessions" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <SessionsPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/sessions/:id" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <SessionDetail />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/analytics" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <AnalyticsPage />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* Protected Client Routes */}
            <Route element={<Layout />}>
              <Route 
                path="/client/dashboard" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <Dashboard />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/client/reflections" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <ReflectionsPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/client/resources" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <ResourcesPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/client/sessions" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <SessionsPage />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* Shared Protected Routes */}
            <Route element={<Layout />}>
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sessions" 
                element={
                  <ProtectedRoute>
                    <SessionsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reflections" 
                element={
                  <ProtectedRoute>
                    <ReflectionsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Admin Routes */}
            <Route element={<Layout />}>
              <Route 
                path="/admin" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* Development/Demo Routes - only in development */}
            {import.meta.env.DEV && (
              <Route element={<Layout />}>
                <Route path="/test" element={<TestPage />} />
                <Route path="/debug" element={<DebugPage />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
                <Route path="/demo/rich-text" element={<RichTextEditorDemo />} />
                <Route path="/demo/reflection" element={<ReflectionDemo />} />
                <Route path="/demo/audio" element={<AudioRecorderDemo />} />
                <Route path="/demo/audio-reflection" element={<AudioReflectionTest />} />
                <Route path="/demo/mobile-audio" element={<MobileAudioTest />} />
                <Route path="/demo/notes" element={<NotesDemo />} />
                <Route path="/demo/hipaa" element={<HIPAAComplianceDashboard />} />
              </Route>
            )}

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
  );
};

export default App;
