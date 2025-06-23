import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOffline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface UsePWAReturn extends PWAState {
  install: () => Promise<boolean>;
  showInstallPrompt: () => void;
  updateServiceWorker: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToNotifications: () => Promise<PushSubscription | null>;
}

export const usePWA = (): UsePWAReturn => {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOffline: !navigator.onLine,
    swRegistration: null,
    installPrompt: null,
  });

  // Check if app is installed
  const checkInstallationStatus = useCallback(() => {
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    
    setState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        console.log('[PWA] Registering KILLER service worker...');
        const registration = await navigator.serviceWorker.register('/sw-kill.js', {
          scope: '/',
        });

        console.log('[PWA] Killer service worker registered successfully:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('[PWA] Service worker update found');
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker installed, prompting for update');
                // Show update available notification
                if (window.confirm('A new version is available. Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });

        setState(prev => ({ ...prev, swRegistration: registration }));
        return registration;
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
        return null;
      }
    } else {
      console.warn('[PWA] Service workers not supported');
      return null;
    }
  }, []);

  // Handle install prompt
  const handleInstallPrompt = useCallback((e: BeforeInstallPromptEvent) => {
    console.log('[PWA] Install prompt event received');
    e.preventDefault();
    setState(prev => ({ 
      ...prev, 
      isInstallable: true,
      installPrompt: e 
    }));
  }, []);

  // Show install prompt
  const showInstallPrompt = useCallback(() => {
    if (state.installPrompt) {
      console.log('[PWA] Showing install prompt');
      state.installPrompt.prompt();
    }
  }, [state.installPrompt]);

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      console.log('[PWA] Prompting for installation...');
      await state.installPrompt.prompt();
      const choiceResult = await state.installPrompt.userChoice;
      
      console.log('[PWA] User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        setState(prev => ({ 
          ...prev, 
          isInstalled: true,
          isInstallable: false,
          installPrompt: null 
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
      return false;
    }
  }, [state.installPrompt]);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (state.swRegistration) {
      try {
        console.log('[PWA] Checking for service worker updates...');
        await state.swRegistration.update();
      } catch (error) {
        console.error('[PWA] Service worker update failed:', error);
      }
    }
  }, [state.swRegistration]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      console.log('[PWA] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[PWA] Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('[PWA] Notification permission request failed:', error);
      return 'denied';
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToNotifications = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.swRegistration || !('PushManager' in window)) {
      console.warn('[PWA] Push notifications not supported');
      return null;
    }

    try {
      console.log('[PWA] Subscribing to push notifications...');
      
      // Check if already subscribed
      const existingSubscription = await state.swRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[PWA] Already subscribed to push notifications');
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await state.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY, // You'll need to set this
      });

      console.log('[PWA] Push notification subscription created:', subscription);
      
      // Send subscription to server
      // await sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('[PWA] Push notification subscription failed:', error);
      return null;
    }
  }, [state.swRegistration]);

  // Handle online/offline status
  const handleOnlineStatus = useCallback(() => {
    setState(prev => ({ ...prev, isOffline: !navigator.onLine }));
  }, []);

  // Initialize PWA
  useEffect(() => {
    console.log('[PWA] Initializing PWA features...');
    
    // Check installation status
    checkInstallationStatus();
    
    // Register service worker
    registerServiceWorker();
    
    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      handleInstallPrompt(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setState(prev => ({ 
        ...prev, 
        isInstalled: true,
        isInstallable: false,
        installPrompt: null 
      }));
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Listen for online/offline changes
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Check for display mode changes (for iOS Add to Home Screen)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      checkInstallationStatus();
    };
    
    mediaQuery.addListener(handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      mediaQuery.removeListener(handleDisplayModeChange);
    };
  }, [checkInstallationStatus, registerServiceWorker, handleInstallPrompt, handleOnlineStatus]);

  return {
    ...state,
    install,
    showInstallPrompt,
    updateServiceWorker,
    requestNotificationPermission,
    subscribeToNotifications,
  };
}; 