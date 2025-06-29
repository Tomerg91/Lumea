/**
 * Daily Intention Check Hook
 * 
 * Hook to check if user needs to select daily intentions and handle navigation
 * Used in app initialization to redirect users to beings selection if needed
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { intentionService } from '../services/intentionService';
import { useAuth } from '../contexts/AuthContext';

export interface DailyIntentionCheckResult {
  needsSelection: boolean;
  isLoading: boolean;
  error: string | null;
  checkComplete: boolean;
}

export const useDailyIntentionCheck = (
  enabled: boolean = true,
  autoRedirect: boolean = true
): DailyIntentionCheckResult => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [needsSelection, setNeedsSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkComplete, setCheckComplete] = useState(false);

  useEffect(() => {
    // Only check if enabled, user is authenticated, and check hasn't been completed
    if (!enabled || !isAuthenticated || !user || checkComplete) {
      return;
    }

    const checkDailyIntentionStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const needsBeingsSelection = await intentionService.needsBeingsSelection();
        setNeedsSelection(needsBeingsSelection);
        setCheckComplete(true);
        
        // Auto-redirect to beings selection if needed
        if (needsBeingsSelection && autoRedirect) {
          navigate('/select-intentions');
        }
        
      } catch (err) {
        console.error('Error checking daily intention status:', err);
        setError(err instanceof Error ? err.message : 'Failed to check daily intention status');
        setCheckComplete(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkDailyIntentionStatus();
  }, [enabled, isAuthenticated, user, navigate, autoRedirect, checkComplete]);

  // Reset check when user changes
  useEffect(() => {
    if (user) {
      setCheckComplete(false);
      setNeedsSelection(false);
      setError(null);
    }
  }, [user?.id]);

  return {
    needsSelection,
    isLoading,
    error,
    checkComplete
  };
};

/**
 * Simple hook that just checks status without auto-redirect
 */
export const useDailyIntentionStatus = () => {
  return useDailyIntentionCheck(true, false);
};

/**
 * Hook for manual intention check (e.g., on button click)
 */
export const useManualIntentionCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkNow = async (): Promise<boolean> => {
    try {
      setIsChecking(true);
      setError(null);
      
      const needsSelection = await intentionService.needsBeingsSelection();
      setLastCheckResult(needsSelection);
      
      return needsSelection;
    } catch (err) {
      console.error('Error in manual intention check:', err);
      setError(err instanceof Error ? err.message : 'Check failed');
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkNow,
    isChecking,
    lastCheckResult,
    error
  };
};

export default useDailyIntentionCheck;