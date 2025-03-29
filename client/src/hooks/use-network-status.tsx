import { useState, useEffect } from 'react';

type NetworkStatusState = {
  isOnline: boolean;
  wasOffline: boolean;
  offlineSince: Date | null;
  onlineSince: Date | null;
  connectionType: string | null;
  networkEffectiveType: string | null;
};

/**
 * Hook to monitor and provide network status information
 * @returns Network status state and methods to check network
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusState>({
    isOnline: navigator.onLine,
    wasOffline: false,
    offlineSince: null,
    onlineSince: navigator.onLine ? new Date() : null,
    connectionType: getConnectionType(),
    networkEffectiveType: getEffectiveConnectionType(),
  });

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: !prev.isOnline,
        onlineSince: new Date(),
        connectionType: getConnectionType(),
        networkEffectiveType: getEffectiveConnectionType(),
      }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        offlineSince: new Date(),
        connectionType: null,
        networkEffectiveType: null,
      }));
    };

    const handleConnectionChange = () => {
      setNetworkStatus(prev => ({
        ...prev,
        connectionType: getConnectionType(),
        networkEffectiveType: getEffectiveConnectionType(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Use the Network Information API if available
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  /**
   * Check if the current network is fast enough for the given requirement
   * @param requirement Minimum connection speed needed ('slow2g'|'2g'|'3g'|'4g')
   * @returns Boolean indicating if current connection meets requirement
   */
  const isNetworkFast = (requirement: '2g' | '3g' | '4g' = '3g'): boolean => {
    if (!networkStatus.isOnline) return false;

    const effectiveType = networkStatus.networkEffectiveType;
    if (!effectiveType) return true; // Default to true if we can't determine

    const connectionTypes = ['slow-2g', '2g', '3g', '4g'];
    const reqIndex = connectionTypes.indexOf(requirement);
    const currentIndex = connectionTypes.indexOf(effectiveType);

    return currentIndex >= reqIndex;
  };

  /**
   * Check if the current connection is metered (user pays per data usage)
   * @returns Boolean indicating if connection is metered, or null if it can't be determined
   */
  const isConnectionMetered = (): boolean | null => {
    const connection = getConnection();
    if (!connection || typeof connection.saveData === 'undefined') {
      return null;
    }
    return connection.saveData;
  };

  return {
    ...networkStatus,
    isNetworkFast,
    isConnectionMetered,
    checkConnection: () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        connectionType: getConnectionType(),
        networkEffectiveType: getEffectiveConnectionType(),
      }));
    }
  };
}

/**
 * Get the connection object if the Network Information API is available
 */
function getConnection(): any {
  // @ts-ignore - TypeScript doesn't know about the Network Information API
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

/**
 * Get the connection type if available
 */
function getConnectionType(): string | null {
  const connection = getConnection();
  if (!connection || !connection.type) {
    return null;
  }
  return connection.type;
}

/**
 * Get the effective connection type if available
 */
function getEffectiveConnectionType(): string | null {
  const connection = getConnection();
  if (!connection || !connection.effectiveType) {
    return null;
  }
  return connection.effectiveType;
}