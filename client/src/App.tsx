import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import SettingsPage from "@/pages/settings-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import JoinPage from "@/pages/join-page";
import { useEffect } from "react";
import { useIsNative } from "@/hooks/use-mobile";
import { setupDeepLinks } from "@/lib/mobile";
import { MobileNavbar } from "@/components/mobile-nav";

// Coach routes
import CoachDashboard from "@/pages/coach/dashboard";
import CoachClients from "@/pages/coach/clients";
import CoachSessions from "@/pages/coach/sessions";
import CoachResources from "@/pages/coach/resources";
import CoachPayments from "@/pages/coach/payments";

// Client routes
import ClientDashboard from "@/pages/client/dashboard";
import ClientSessions from "@/pages/client/sessions";
import ClientReflections from "@/pages/client/reflections";
import ClientResources from "@/pages/client/resources";
import ClientPayments from "@/pages/client/payments";

// Demo pages
import AudioDemoPage from "@/pages/demo/audio-demo";

import { useAuth } from "@/hooks/use-auth";

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
      <Router />
      <Toaster />
      
      {/* Mobile Navigation Bar */}
      <MobileNavbar />
      
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