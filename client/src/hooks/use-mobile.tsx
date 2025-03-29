import { useState, useEffect } from "react";

/**
 * Hook to detect if the current device is a mobile device.
 * @returns {boolean} True if the device is mobile, false otherwise.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Check for mobile user agent
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i;
      const tabletRegex = /android|ipad|playbook|silk/i;
      
      return mobileRegex.test(userAgent) || tabletRegex.test(userAgent);
    };
    
    // Check for screen size
    const checkScreenSize = () => {
      return window.innerWidth <= 768;
    };
    
    const handleResize = () => {
      setIsMobile(checkMobile() || checkScreenSize());
    };
    
    // Check initially and add resize listener
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  return isMobile;
}

/**
 * Hook to detect if the app is running in a native environment via Capacitor.
 * @returns {boolean} True if running in a native app, false if in browser.
 */
export function useIsNative() {
  const [isNative, setIsNative] = useState<boolean>(false);
  
  useEffect(() => {
    async function checkNative() {
      try {
        // Dynamic import for Capacitor to avoid loading it in browser environments
        const { Capacitor } = await import('@capacitor/core');
        setIsNative(Capacitor.isNativePlatform());
      } catch (err) {
        console.log('Capacitor not available', err);
        setIsNative(false);
      }
    }
    
    checkNative();
  }, []);
  
  return isNative;
}

/**
 * Hook to detect the current platform (web, iOS, Android)
 * @returns {'web' | 'ios' | 'android'} The current platform
 */
export function usePlatform() {
  const [platform, setPlatform] = useState<'web' | 'ios' | 'android'>('web');
  
  useEffect(() => {
    async function checkPlatform() {
      try {
        // Dynamic import for Capacitor to avoid loading it in browser environments
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          if (Capacitor.getPlatform() === 'ios') {
            setPlatform('ios');
          } else if (Capacitor.getPlatform() === 'android') {
            setPlatform('android');
          }
        }
      } catch (err) {
        console.log('Capacitor not available', err);
      }
    }
    
    checkPlatform();
  }, []);
  
  return platform;
}

/**
 * Hook to detect if the device is currently online
 * @returns {boolean} True if online, false if offline
 */
export function useIsOnline() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Check network status using Capacitor Network plugin if available
    async function checkNetworkStatus() {
      try {
        const isNative = await checkIfNative();
        
        if (isNative) {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          setIsOnline(status.connected);
          
          // Listen for network status changes
          Network.addListener('networkStatusChange', (status) => {
            setIsOnline(status.connected);
          });
        }
      } catch (err) {
        console.log('Capacitor Network plugin not available', err);
      }
    }
    
    // Helper function to check if we're in a native environment
    async function checkIfNative() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        return Capacitor.isNativePlatform();
      } catch {
        return false;
      }
    }
    
    // In browser environments, use standard online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Also check using Capacitor if available
    checkNetworkStatus();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Cleanup Capacitor listener if it was registered
      (async () => {
        try {
          const isNative = await checkIfNative();
          if (isNative) {
            const { Network } = await import('@capacitor/network');
            Network.removeAllListeners();
          }
        } catch (err) {
          // Ignore errors during cleanup
        }
      })();
    };
  }, []);
  
  return isOnline;
}