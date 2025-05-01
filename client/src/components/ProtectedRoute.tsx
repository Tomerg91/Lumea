import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    // Show loading indicator while checking auth status
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated if no session
  if (!session) {
    console.log("ProtectedRoute: Not authenticated, redirecting to login.");
    return <Navigate to="/auth" replace />;
  }

  // Check role if roles are specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!profile || !allowedRoles.includes(profile.role)) {
      console.log("ProtectedRoute: User doesn't have required role, redirecting to home.");
      return <Navigate to="/" replace />;
    }
  }

  // Render the children (e.g., the Layout and its Outlet) if authenticated
  // If children prop is provided, render it. Otherwise, default to Outlet for nested routes.
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute; 