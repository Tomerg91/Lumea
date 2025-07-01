import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CoachOnboardingWizard from '../components/onboarding/CoachOnboardingWizard';

export const CoachOnboardingPage: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    // Redirect if not a coach
    if (!loading && profile && profile.role !== 'coach') {
      navigate('/dashboard');
      return;
    }

    // TODO: Add logic to check if coach has already completed onboarding
    // For now, always show the wizard for coaches
  }, [user, profile, loading, navigate]);

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding experience...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated or not a coach
  if (!user || !profile || profile.role !== 'coach') {
    return null;
  }

  return <CoachOnboardingWizard />;
};

export default CoachOnboardingPage; 