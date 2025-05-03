import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackPageView } from '../utils/analytics/track';

/**
 * Hook to automatically track page views when the route changes
 * Includes role information from auth context but no personal identifiers
 */
export const usePageTracking = (): void => {
  const location = useLocation();
  const { profile } = useAuth();

  useEffect(() => {
    // Get page properties without PII
    const properties = {
      path: location.pathname,
      search: location.search,
      // Only include role, avoiding any PII
      role: profile?.role as 'client' | 'coach' | 'admin' | undefined,
    };

    // Track the page view
    trackPageView(properties);
  }, [location.pathname, location.search, profile?.role]);
};

export default usePageTracking; 