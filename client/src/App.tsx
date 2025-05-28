import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import usePageTracking from './hooks/usePageTracking';
import { usePWA } from './hooks/usePWA';
import Navigation from './components/Navigation';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './App.css';

// Implement lazy loading for all page components
const HomePage = lazy(() => import('./pages/Index'));
const AuthPage = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientsPage = lazy(() => import('./pages/Dashboard/ClientsPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const SessionDetail = lazy(() => import('./pages/SessionDetail'));
const TestPage = lazy(() => import('./pages/Test'));
const DebugPage = lazy(() => import('./pages/Debug'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystem'));
const RichTextEditorDemo = lazy(() => import('./components/RichTextEditorDemo').then(module => ({ default: module.RichTextEditorDemo })));
const ReflectionDemo = lazy(() => import('./pages/ReflectionDemo'));
const AudioRecorderDemo = lazy(() => import('./components/audio/AudioRecorderDemo'));
const AudioReflectionTest = lazy(() => import('./components/audio/AudioReflectionTest').then(module => ({ default: module.AudioReflectionTest })));
const MobileAudioTest = lazy(() => import('./components/audio/MobileAudioTest').then(module => ({ default: module.MobileAudioTest })));
const NotesDemo = lazy(() => import('./components/notes/NotesDemo').then(module => ({ default: module.NotesDemo })));
const ReflectionsPage = lazy(() => import('./pages/ReflectionsPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const Offline = lazy(() => import('./pages/Offline'));
const CalendarCallback = lazy(() => import('./components/calendar/CalendarCallback').then(module => ({ default: module.CalendarCallback })));

// Loading component with Lumea design
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-background flex items-center justify-center">
    <div className="glass-card-strong rounded-2xl p-8 text-center">
      <div className="w-12 h-12 bg-gradient-teal-blue rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
        <div className="w-6 h-6 bg-white rounded-full"></div>
      </div>
      <p className="text-lg font-medium">טוען... / Loading...</p>
    </div>
  </div>
);

// Enhanced Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Role-based Route component
const RoleProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile?.role || !allowedRoles.includes(profile.role as string)) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="card-lumea-strong max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-gradient-purple mb-4">
            Access Denied / אין הרשאה
          </h2>
          <p className="opacity-80 mb-6">
            You don't have permission to access this page. / אין לך הרשאה לגשת לדף זה.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
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
  <div className="min-h-screen bg-gradient-background">
    <Navigation />
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
);

// Public layout for pages that don't need navigation
const PublicLayout = () => (
  <div className="min-h-screen bg-gradient-background">
    <Outlet />
  </div>
);

// 404 Not Found component
const NotFound = () => (
  <div className="min-h-screen bg-gradient-background flex items-center justify-center">
    <div className="card-lumea-strong max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-gradient-yellow-peach rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl">🔍</span>
      </div>
      <h1 className="text-4xl font-bold text-gradient-purple mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-4">
        Page Not Found / דף לא נמצא
      </h2>
      <p className="opacity-80 mb-6">
        The page you're looking for doesn't exist. / הדף שאתה מחפש לא קיים.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="btn-primary"
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
    <LanguageProvider>
      <div className="App">
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        
        {/* Offline indicator */}
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm font-medium z-50">
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
                path="/coach/reflections" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <ReflectionsPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/resources" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <ResourcesPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/profile" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach']}>
                    <SettingsPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/coach/analytics" 
                element={
                  <RoleProtectedRoute allowedRoles={['coach', 'admin']}>
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
                path="/client/sessions" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <SessionsPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/client/sessions/:id" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <SessionDetail />
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
                path="/client/profile" 
                element={
                  <RoleProtectedRoute allowedRoles={['client']}>
                    <SettingsPage />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* Admin Routes */}
            <Route element={<Layout />}>
              <Route 
                path="/admin" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <DebugPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="/admin/analytics" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <AnalyticsPage />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* Development/Test Routes */}
            <Route element={<Layout />}>
              <Route 
                path="/test" 
                element={
                  <ProtectedRoute>
                    <TestPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/debug" 
                element={
                  <ProtectedRoute>
                    <DebugPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/design-system" 
                element={
                  <ProtectedRoute>
                    <DesignSystemPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reflection-demo" 
                element={
                  <ProtectedRoute>
                    <ReflectionDemo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/rich-text-demo" 
                element={
                  <ProtectedRoute>
                    <RichTextEditorDemo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/audio-demo" 
                element={
                  <ProtectedRoute>
                    <AudioRecorderDemo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/audio-reflection-test" 
                element={
                  <ProtectedRoute>
                    <AudioReflectionTest />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/mobile-audio-test" 
                element={
                  <ProtectedRoute>
                    <MobileAudioTest />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notes-demo" 
                element={
                  <ProtectedRoute>
                    <NotesDemo />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </LanguageProvider>
  );
};

export default App;
