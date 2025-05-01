import React from 'react';
import { Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ClientsPage from './pages/Dashboard/ClientsPage';
import AuthPage from './pages/Auth';
import HomePage from './pages/Index'; // Import HomePage component
import Dashboard from './pages/Dashboard'; // Import the Dashboard component
import TestPage from './pages/Test'; // Import TestPage component
import DebugPage from './pages/Debug'; // Import DebugPage component
import './App.css';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

// Protected Route Component - redirect to /auth
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { session, profile, loading } = useAuth();

  // Log the state received by ProtectedRoute
  console.log('[ProtectedRoute] State:', {
    loading,
    sessionExists: !!session,
    profileRole: profile?.role,
    allowedRoles,
  });

  if (loading) {
    console.log('[ProtectedRoute] Rendering Loading state');
    return <div>Loading session...</div>;
  }

  if (!session) {
    // Redirect to /auth if not authenticated
    console.log('[ProtectedRoute] No session, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // Added check for profile existence before role check
  if (!profile) {
    console.log('[ProtectedRoute] Session exists, but profile not yet loaded. Rendering loading.');
    // It's possible to be authenticated but profile hasn't loaded yet
    // Render loading or a placeholder, DO NOT redirect to /auth here
    return <div>Loading profile...</div>; // Or null, or a spinner
  }

  // Check if the user's role is in the allowedRoles array
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    console.log(
      `[ProtectedRoute] Role mismatch (Profile: ${profile.role}, Allowed: ${allowedRoles}), redirecting to /`
    );

    // If they're logged in but wrong role, redirect to their appropriate dashboard
    if (profile.role === 'coach') {
      console.log('[ProtectedRoute] Redirecting coach to /coach/dashboard');
      return <Navigate to="/coach/dashboard" replace />;
    } else if (profile.role === 'client') {
      console.log('[ProtectedRoute] Redirecting client to /client/dashboard');
      return <Navigate to="/client/dashboard" replace />;
    }

    // Fallback if no recognized role
    return <Navigate to="/" replace />;
  }

  console.log('[ProtectedRoute] Checks passed, rendering Outlet');
  return <Outlet />;
};

const App: React.FC = () => {
  const { session, profile, signOut, loading } = useAuth();

  return (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/test">Test Page</Link> |{' '}
        <Link to="/debug">Debug</Link>
        {/* Show different links based on auth state and role */}
        {session && profile?.role === 'coach' && (
          <>
            | <Link to="/coach/dashboard">Dashboard</Link>|{' '}
            <Link to="/coach/clients">My Clients</Link>
          </>
        )}
        {session && profile?.role === 'client' && (
          <>
            | <Link to="/client/dashboard">My Dashboard</Link>
          </>
        )}
        {/* Add links for other roles/pages */}
        <span style={{ float: 'right' }}>
          {loading ? (
            'Loading...'
          ) : session ? (
            <>
              <span>
                {profile?.email || 'User'} ({profile?.role})
              </span>
              <button onClick={signOut} style={{ marginLeft: '10px' }}>
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/auth">Login / Sign Up</Link> // Link to the combined auth page
          )}
        </span>
      </nav>

      <main style={{ paddingTop: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} /> {/* Use HomePage component */}
          <Route path="/auth" element={<AuthPage />} /> {/* Route for Auth component */}
          <Route path="/test" element={<TestPage />} /> {/* New Test Page Route */}
          <Route path="/debug" element={<DebugPage />} /> {/* Debug Page Route */}
          {/* Coach Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['coach']} />}>
            <Route path="/coach/dashboard" element={<Dashboard />} />
            <Route path="/coach/clients" element={<ClientsPage />} />
            <Route path="/coach/sessions" element={<div>Coach Sessions Page</div>} />
            <Route path="/coach/reflections" element={<div>Coach Reflections Page</div>} />
            <Route path="/coach/resources" element={<div>Coach Resources Page</div>} />
            <Route path="/coach/profile" element={<div>Coach Profile Page</div>} />
          </Route>
          {/* Coach Protected Routes (legacy paths) */}
          <Route element={<ProtectedRoute allowedRoles={['coach']} />}>
            <Route path="/dashboard" element={<Navigate to="/coach/dashboard" replace />} />
            <Route path="/clients" element={<Navigate to="/coach/clients" replace />} />
          </Route>
          {/* Client Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route path="/client/dashboard" element={<Dashboard />} />
            <Route path="/client/sessions" element={<div>Client Sessions Page</div>} />
            <Route path="/client/reflections" element={<div>Client Reflections Page</div>} />
            <Route path="/client/resources" element={<div>Client Resources Page</div>} />
            <Route path="/client/profile" element={<div>Client Profile Page</div>} />
          </Route>
          {/* Fallback 404 route */}
          <Route
            path="*"
            element={
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>404 Not Found</h2>
                <p>The page you&apos;re looking for doesn&apos;t exist.</p>
                <div style={{ marginTop: '1rem' }}>
                  <Link to="/">Go Home</Link>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
