import { Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ClientsPage from './pages/Dashboard/ClientsPage';
import AuthPage from './pages/Auth';
import './App.css'

// Protected Route Component - redirect to /auth
const ProtectedRoute = ({ allowedRoles }) => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div>Loading session...</div>; 
  }

  if (!session) {
    // Redirect to /auth if not authenticated
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/" replace />; // Or an unauthorized page
  }

  return <Outlet />;
};

function App() {
  const { session, profile, signOut, loading } = useAuth(); 

  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        {/* Show different links based on auth state and role */} 
        {session && profile?.role === 'coach' && ( 
          <> 
           | <Link to="/dashboard/clients">My Clients</Link>
          </>
        )}
        {/* Add links for other roles/pages */} 
        
        <span style={{ float: 'right' }}>
          {loading ? (
            'Loading...' 
          ) : session ? (
            <>
              <span>{profile?.email || 'User'} ({profile?.role})</span> 
              <button onClick={signOut} style={{ marginLeft: '10px'}}>Sign Out</button>
            </>
          ) : (
             <Link to="/auth">Login / Sign Up</Link> // Link to the combined auth page
          )}
        </span>
      </nav>

      <main style={{ paddingTop: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<div>Home Page (Public)</div>} /> 
          <Route path="/auth" element={<AuthPage />} /> {/* Route for Auth component */} 
          {/* Remove /login and /signup routes */}

          {/* Protected Routes */} 
          <Route element={<ProtectedRoute allowedRoles={['coach']} />}>
            <Route path="/dashboard" element={<div>Coach Dashboard</div>} /> {/* Example dashboard route */} 
            <Route path="/dashboard/clients" element={<ClientsPage />} />
          </Route>

          {/* Add other routes for clients, admins etc. potentially with different allowedRoles */}
          {/* Example: 
          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route path="/my-reflections" element={<ReflectionsPage />} />
          </Route>
          */}

          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App 