import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";

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

import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />

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
  return (
    <div className="min-h-screen bg-gray-50 font-assistant" dir="rtl">
      <Router />
      <Toaster />
    </div>
  );
}

export default App;
