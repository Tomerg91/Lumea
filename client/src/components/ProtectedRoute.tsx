import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Assuming context is in src/context

interface ProtectedRouteProps {
  children?: React.ReactNode; // Allow wrapping specific components if needed, otherwise use Outlet
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show loading indicator while checking auth status
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    console.log("ProtectedRoute: Not authenticated, redirecting to login.");
    return <Navigate to="/" replace />;
  }

  // Render the children (e.g., the Layout and its Outlet) if authenticated
  // If children prop is provided, render it. Otherwise, default to Outlet for nested routes.
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute; 