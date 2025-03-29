import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

// Import translations
import { t } from '@/lib/i18n';

// Define the context type
type OnboardingContextType = {
  startTutorial: (tutorialName: string) => void;
  skipTutorial: () => void;
  resetTutorial: (tutorialName: string) => void;
  completedTutorials: string[];
  markAsSeen: (tutorialName: string) => void;
  currentTutorial: string | null;
};

// Create context with default values
export const OnboardingContext = createContext<OnboardingContextType>({
  startTutorial: () => {},
  skipTutorial: () => {},
  resetTutorial: () => {},
  completedTutorials: [],
  markAsSeen: () => {},
  currentTutorial: null,
});

// Define available tutorials
export const TUTORIALS = {
  COACH_DASHBOARD: 'coach_dashboard',
  CLIENT_DASHBOARD: 'client_dashboard',
  CLIENT_MANAGEMENT: 'client_management',
  SESSION_SCHEDULING: 'session_scheduling',
  REFLECTION_TOOLS: 'reflection_tools',
};

// Define the props for the OnboardingProvider component
interface OnboardingProviderProps {
  children: ReactNode;
}

// Create the OnboardingProvider component
export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  const [tutorialInstance, setTutorialInstance] = useState<ReturnType<typeof introJs> | null>(null);

  // Fetch user's completed tutorials on mount
  useEffect(() => {
    if (user) {
      // In a real app, we would fetch this from the server
      // For now, we'll use localStorage
      const savedTutorials = localStorage.getItem(`${user.id}_completed_tutorials`);
      if (savedTutorials) {
        setCompletedTutorials(JSON.parse(savedTutorials));
      }
    }
  }, [user]);

  // Save completed tutorials when they change
  useEffect(() => {
    if (user && completedTutorials.length > 0) {
      localStorage.setItem(`${user.id}_completed_tutorials`, JSON.stringify(completedTutorials));
      
      // In a real app, we would also save this to the server
      // updateUserPreferences({completedTutorials});
    }
  }, [completedTutorials, user]);

  // Tutorial configurations
  const getTutorialSteps = (tutorialName: string) => {
    switch (tutorialName) {
      case TUTORIALS.COACH_DASHBOARD:
        return [
          {
            element: '[data-intro="coach-dashboard-welcome"]',
            intro: t('onboarding.coach.dashboard.welcome'),
            position: 'bottom',
          },
          {
            element: '[data-intro="coach-dashboard-clients-overview"]',
            intro: t('onboarding.coach.dashboard.clientsOverview'),
            position: 'right',
          },
          {
            element: '[data-intro="coach-dashboard-sessions"]',
            intro: t('onboarding.coach.dashboard.upcomingSessions'),
            position: 'left',
          },
          {
            element: '[data-intro="coach-dashboard-metrics"]',
            intro: t('onboarding.coach.dashboard.metrics'),
            position: 'top',
          },
          {
            element: '[data-intro="coach-dashboard-navigation"]',
            intro: t('onboarding.coach.dashboard.navigation'),
            position: 'right',
          },
        ];

      case TUTORIALS.CLIENT_DASHBOARD:
        return [
          {
            element: '[data-intro="client-dashboard-welcome"]',
            intro: t('onboarding.client.dashboard.welcome'),
            position: 'bottom',
          },
          {
            element: '[data-intro="client-dashboard-coach"]',
            intro: t('onboarding.client.dashboard.coachInfo'),
            position: 'right',
          },
          {
            element: '[data-intro="client-dashboard-sessions"]',
            intro: t('onboarding.client.dashboard.upcomingSessions'),
            position: 'left',
          },
          {
            element: '[data-intro="client-dashboard-reflections"]',
            intro: t('onboarding.client.dashboard.reflections'),
            position: 'top',
          },
          {
            element: '[data-intro="client-dashboard-resources"]',
            intro: t('onboarding.client.dashboard.resources'),
            position: 'left',
          },
        ];

      case TUTORIALS.CLIENT_MANAGEMENT:
        return [
          {
            element: '[data-intro="clients-management-welcome"]',
            intro: t('onboarding.coach.clients.welcome'),
            position: 'bottom',
          },
          {
            element: '[data-intro="clients-management-invite"]',
            intro: t('onboarding.coach.clients.invite'),
            position: 'bottom',
          },
          {
            element: '[data-intro="clients-management-search"]',
            intro: t('onboarding.coach.clients.search'),
            position: 'left',
          },
          {
            element: '[data-intro="clients-management-filters"]',
            intro: t('onboarding.coach.clients.filters'),
            position: 'top',
          },
          {
            element: '[data-intro="clients-management-actions"]',
            intro: t('onboarding.coach.clients.actions'),
            position: 'left',
          },
        ];

      case TUTORIALS.SESSION_SCHEDULING:
        return [
          {
            element: '[data-intro="session-scheduling-welcome"]',
            intro: t('onboarding.sessions.welcome'),
            position: 'bottom',
          },
          {
            element: '[data-intro="session-scheduling-calendar"]',
            intro: t('onboarding.sessions.calendar'),
            position: 'right',
          },
          {
            element: '[data-intro="session-scheduling-create"]',
            intro: t('onboarding.sessions.create'),
            position: 'left',
          },
          {
            element: '[data-intro="session-scheduling-list"]',
            intro: t('onboarding.sessions.list'),
            position: 'bottom',
          },
        ];
        
      case TUTORIALS.REFLECTION_TOOLS:
        return [
          {
            element: '[data-intro="reflection-tools-welcome"]',
            intro: t('onboarding.reflections.welcome'),
            position: 'bottom',
          },
          {
            element: '[data-intro="reflection-tools-create"]',
            intro: t('onboarding.reflections.create'),
            position: 'right',
          },
          {
            element: '[data-intro="reflection-tools-audio"]',
            intro: t('onboarding.reflections.audio'),
            position: 'top',
          },
          {
            element: '[data-intro="reflection-tools-text"]',
            intro: t('onboarding.reflections.text'),
            position: 'left',
          },
          {
            element: '[data-intro="reflection-tools-sharing"]',
            intro: t('onboarding.reflections.sharing'),
            position: 'bottom',
          },
        ];

      default:
        return [];
    }
  };

  // Start a specific tutorial
  const startTutorial = (tutorialName: string) => {
    if (completedTutorials.includes(tutorialName)) {
      return; // Skip if already completed
    }

    const steps = getTutorialSteps(tutorialName);
    setCurrentTutorial(tutorialName);

    // Configure and start intro.js
    const intro = introJs();
    intro.setOptions({
      steps,
      showBullets: false,
      showProgress: true,
      exitOnOverlayClick: false,
      disableInteraction: false,
      doneLabel: t('onboarding.finish'),
      nextLabel: t('onboarding.next'),
      prevLabel: t('onboarding.prev'),
      skipLabel: t('onboarding.skip'),
      overlayOpacity: 0.7,
      tooltipClass: 'customTooltip',
      highlightClass: 'customHighlight',
    });

    intro.oncomplete(() => {
      markAsSeen(tutorialName);
      setCurrentTutorial(null);
    });

    intro.onexit(() => {
      setCurrentTutorial(null);
    });

    intro.onskip(() => {
      skipTutorial();
    });

    setTutorialInstance(intro);
    intro.start();
  };

  // Skip the current tutorial
  const skipTutorial = () => {
    if (tutorialInstance) {
      tutorialInstance.exit(true);
    }
    setCurrentTutorial(null);
  };

  // Mark a tutorial as completed
  const markAsSeen = (tutorialName: string) => {
    if (!completedTutorials.includes(tutorialName)) {
      setCompletedTutorials([...completedTutorials, tutorialName]);
    }
  };

  // Reset a specific tutorial so it can be viewed again
  const resetTutorial = (tutorialName: string) => {
    setCompletedTutorials(completedTutorials.filter(t => t !== tutorialName));
  };

  // Context value
  const contextValue: OnboardingContextType = {
    startTutorial,
    skipTutorial,
    resetTutorial,
    completedTutorials,
    markAsSeen,
    currentTutorial,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook for easy access to the onboarding context
export const useOnboarding = () => useContext(OnboardingContext);