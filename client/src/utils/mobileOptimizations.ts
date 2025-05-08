/**
 * Mobile-specific optimizations for better performance on mobile devices
 */

// Device detection utilities
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isLowEnd: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  connectionType?: string;
  connectionSpeed?: 'slow' | 'medium' | 'fast';
}

/**
 * Detect device information for optimization decisions
 * @returns Device information object
 */
export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent || '';
  const connection = (navigator as any).connection;

  // Basic device detection
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // Detect if device is low-end based on memory and CPU cores
  const isLowEnd = detectLowEndDevice();

  // Detect connection type
  const connectionType = connection?.type || 'unknown';
  let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium';

  if (connection) {
    if (connection.downlink < 1 || connection.rtt > 500) {
      connectionSpeed = 'slow';
    } else if (connection.downlink > 5 && connection.rtt < 100) {
      connectionSpeed = 'fast';
    }
  }

  return {
    isMobile,
    isTablet,
    isLowEnd,
    isIOS,
    isAndroid,
    connectionType,
    connectionSpeed,
  };
}

/**
 * Detect if the device is low-end based on available resources
 */
function detectLowEndDevice(): boolean {
  // Check available memory (Chrome only)
  const memory = (performance as any).memory;
  if (memory && memory.jsHeapSizeLimit) {
    // Less than 300MB heap size indicates a low-end device
    if (memory.jsHeapSizeLimit < 300 * 1024 * 1024) {
      return true;
    }
  }

  // Check processor cores
  const cpuCores = navigator.hardwareConcurrency || 0;
  if (cpuCores > 0 && cpuCores <= 4) {
    return true;
  }

  // Check if the device is mobile and connection is slow
  const connection = (navigator as any).connection;
  if (
    connection &&
    /iPhone|Android/i.test(navigator.userAgent) &&
    (connection.downlink < 1 || connection.rtt > 500 || connection.saveData)
  ) {
    return true;
  }

  return false;
}

/**
 * Adjust application performance based on device capabilities
 * @returns Configuration object with optimized settings
 */
export function getOptimizedConfig() {
  const device = detectDevice();

  return {
    // Image quality (0-100)
    imageQuality: device.isLowEnd || device.connectionSpeed === 'slow' ? 60 : 80,

    // Animation settings
    enableAnimations: !device.isLowEnd,
    reduceMotion: device.isLowEnd || window.matchMedia('(prefers-reduced-motion: reduce)').matches,

    // Rendering optimizations
    enableVirtualLists: device.isMobile || device.isLowEnd,

    // Background processing
    backgroundProcessing: !device.isLowEnd && device.connectionSpeed !== 'slow',

    // Prefetching settings
    enablePrefetching: device.connectionSpeed === 'fast' && !device.isLowEnd,

    // Location precision (affects battery)
    locationPrecision: device.isLowEnd ? 'low' : 'high',

    // Data fetching strategy
    dataStrategy: device.connectionSpeed === 'slow' ? 'minimal' : 'complete',

    // Device specific optimizations
    deviceSpecific: {
      ios: device.isIOS
        ? {
            useNativeScroll: true,
            useHWAcceleration: true,
          }
        : undefined,
      android: device.isAndroid
        ? {
            minimizeReflows: true,
            useRasterization: device.isLowEnd,
          }
        : undefined,
    },
  };
}

/**
 * Apply device-specific styles based on device capabilities
 */
export function applyOptimizedStyles() {
  const device = detectDevice();
  const config = getOptimizedConfig();

  // Add optimization classes to document root
  const htmlElement = document.documentElement;

  if (device.isMobile) {
    htmlElement.classList.add('mobile-device');
  }

  if (device.isLowEnd) {
    htmlElement.classList.add('low-end-device');
  }

  if (device.connectionSpeed === 'slow') {
    htmlElement.classList.add('slow-connection');
  }

  if (config.reduceMotion) {
    htmlElement.classList.add('reduce-motion');
  }

  // Set CSS variables for optimized values
  htmlElement.style.setProperty('--optimal-image-quality', `${config.imageQuality}%`);
  htmlElement.style.setProperty('--enable-animations', config.enableAnimations ? '1' : '0');
}

// Initialize on import, so it's available immediately
const deviceInfo = detectDevice();

export default {
  deviceInfo,
  detectDevice,
  getOptimizedConfig,
  applyOptimizedStyles,
};
