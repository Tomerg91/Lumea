import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import { Suspense, lazy, useEffect } from "react";
import { useIsNative } from "@/hooks/use-mobile";
import { setupDeepLinks } from "@/lib/mobile";
import { MobileNavbar } from "@/components/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { PageLoader } from "@/components/loading-spinner";
import { NetworkStatus } from "@/components/network-status";
import { OfflineStatusBanner } from "@/components/offline-status-banner";

// Lazy-loaded components
const NotFound = lazy(() => import("@/pages/not-found"));
const LandingPage = lazy(() => import("@/pages/landing-page"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const JoinPage = lazy(() => import("@/pages/join-page"));

// Coach routes - lazy loaded
const CoachDashboard = lazy(() => import("@/pages/coach/dashboard"));
const CoachClients = lazy(() => import("@/pages/coach/clients"));
const CoachSessions = lazy(() => import("@/pages/coach/sessions"));
const CoachResources = lazy(() => import("@/pages/coach/resources"));
const CoachPayments = lazy(() => import("@/pages/coach/payments"));

// Client routes - lazy loaded
const ClientDashboard = lazy(() => import("@/pages/client/dashboard"));
const ClientSessions = lazy(() => import("@/pages/client/sessions"));
const ClientReflections = lazy(() => import("@/pages/client/reflections"));
const ClientResources = lazy(() => import("@/pages/client/resources"));
const ClientPayments = lazy(() => import("@/pages/client/payments"));

// Demo pages - lazy loaded
const AudioDemoPage = lazy(() => import("@/pages/demo/audio-demo"));

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/join/:inviteId" component={JoinPage} />

      {/* Coach routes */}
      <ProtectedRoute 
        path="/coach/dashboard" 
        component={CoachDashboard} 
        requiredRole="coach"
      />
      <ProtectedRoute 
        path="/coach/clients" 
        component={CoachClients} 
        requiredRole="coach"
      />
      <ProtectedRoute 
        path="/coach/sessions" 
        component={CoachSessions} 
        requiredRole="coach"
      />
      <ProtectedRoute 
        path="/coach/resources" 
        component={CoachResources} 
        requiredRole="coach"
      />
      <ProtectedRoute 
        path="/coach/payments" 
        component={CoachPayments} 
        requiredRole="coach"
      />

      {/* Client routes */}
      <ProtectedRoute 
        path="/client/dashboard" 
        component={ClientDashboard} 
        requiredRole="client"
      />
      <ProtectedRoute 
        path="/client/sessions" 
        component={ClientSessions} 
        requiredRole="client"
      />
      <ProtectedRoute 
        path="/client/reflections" 
        component={ClientReflections} 
        requiredRole="client"
      />
      <ProtectedRoute 
        path="/client/resources" 
        component={ClientResources} 
        requiredRole="client"
      />
      <ProtectedRoute 
        path="/client/payments" 
        component={ClientPayments} 
        requiredRole="client"
      />
      
      {/* Shared routes */}
      <ProtectedRoute 
        path="/settings" 
        component={SettingsPage} 
      />
      
      {/* Demo routes */}
      <Route path="/demo/audio" component={AudioDemoPage} />

      {/* Redirect logged in users to their dashboard */}
      <Route path="/dashboard">
        {() => {
          if (user?.role === "coach") {
            window.location.href = "/coach/dashboard";
            return null;
          } else if (user?.role === "client") {
            window.location.href = "/client/dashboard";
            return null;
          } else {
            window.location.href = "/auth";
            return null;
          }
        }}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const isNative = useIsNative();
  const [location, setLocation] = useLocation();

  // Setup deep links handling for mobile
  useEffect(() => {
    if (isNative) {
      try {
        setupDeepLinks((url) => {
          // Extract path from the deep link URL
          const path = url.split('//')[1] || '';
          if (path) {
            setLocation('/' + path);
          }
        });
      } catch (error) {
        console.log('Deep links not available in this environment');
      }
    }
  }, [isNative, setLocation]);

  // Add viewport meta tag for better mobile display
  useEffect(() => {
    // Set viewport meta tag for better mobile experience
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);

    // Set theme color for mobile browsers
    const themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    themeColorMeta.content = '#ffffff';
    document.head.appendChild(themeColorMeta);

    return () => {
      document.head.removeChild(viewportMeta);
      document.head.removeChild(themeColorMeta);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-assistant" dir="rtl">
      {/* Offline/Online Status Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-2">
        <OfflineStatusBanner />
      </div>
      
      <Suspense fallback={<PageLoader />}>
        <Router />
      </Suspense>
      <Toaster />
      
      {/* Mobile Navigation Bar */}
      <MobileNavbar />
      
      {/* Network Status Indicator - temporarily disabled for debugging */}
      {/* <NetworkStatus /> */}
      
      {/* Add CSS variables for safe area insets on iOS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --sat-bottom: env(safe-area-inset-bottom, 0px);
            --sat-top: env(safe-area-inset-top, 0px);
            --sat-left: env(safe-area-inset-left, 0px);
            --sat-right: env(safe-area-inset-right, 0px);
          }
          
          body {
            padding-top: var(--sat-top);
            padding-bottom: var(--sat-bottom);
            padding-left: var(--sat-left);
            padding-right: var(--sat-right);
          }
          
          /* Add padding to main content to prevent overlap with mobile nav */
          .main-content {
            padding-bottom: calc(60px + var(--sat-bottom));
          }
        `
      }} />
    </div>
  );
}

export default App;