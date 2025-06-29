/**
 * App Initializer Component
 * 
 * Handles app initialization logic including daily intention checks
 * Wraps the main app to handle authentication flow and daily selection checks
 */

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDailyIntentionCheck } from '../hooks/useDailyIntentionCheck';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { session, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Only check daily intentions if user is authenticated and not on intention-related pages
  const shouldCheckIntentions = session && user && 
    !location.pathname.includes('/select-intentions') &&
    !location.pathname.includes('/auth') &&
    !location.pathname.includes('/landing');

  const { needsSelection, isLoading, error } = useDailyIntentionCheck(
    shouldCheckIntentions,
    true // Enable auto-redirect
  );

  // Handle role-based dashboard routing
  useEffect(() => {
    if (session && user && location.pathname === '/') {
      // Redirect to appropriate dashboard based on user role
      const userRole = (profile?.role as string) || 'client';
      if (userRole === 'coach') {
        navigate('/coach-dashboard', { replace: true });
      } else if (userRole === 'client') {
        navigate('/client-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [session, user, profile, location.pathname, navigate]);

  // Show loading state during intention check
  if (shouldCheckIntentions && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg max-w-md mx-auto">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Checking your daily intentions...
          </p>
          <p className="text-sm text-gray-500">
            בודק את הכוונות היומיות שלך...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if intention check failed
  if (shouldCheckIntentions && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg max-w-md mx-auto">
          <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render the app normally
  return <>{children}</>;
};

export default AppInitializer;