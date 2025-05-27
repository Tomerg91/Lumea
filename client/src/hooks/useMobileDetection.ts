import { useState, useEffect } from 'react';

export interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  isPortrait: boolean;
}

export const useMobileDetection = (): MobileDetectionResult => {
  const [detection, setDetection] = useState<MobileDetectionResult>(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    return {
      isMobile: /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768,
      isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent) || (width >= 768 && width < 1024),
      isDesktop: width >= 1024,
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isAndroid: /Android/i.test(userAgent),
      isTouchDevice: typeof navigator !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      screenWidth: width,
      screenHeight: height,
      isLandscape: width > height,
      isPortrait: height > width,
    };
  });

  useEffect(() => {
    const updateDetection = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDetection({
        isMobile: /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768,
        isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent) || (width >= 768 && width < 1024),
        isDesktop: width >= 1024,
        isIOS: /iPad|iPhone|iPod/.test(userAgent),
        isAndroid: /Android/i.test(userAgent),
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        screenWidth: width,
        screenHeight: height,
        isLandscape: width > height,
        isPortrait: height > width,
      });
    };

    // Update on resize and orientation change
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return detection;
}; 