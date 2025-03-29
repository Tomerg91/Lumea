import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineStorage } from '@/hooks/use-offline-storage';
import { WifiOff, Wifi, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/**
 * Component that displays the current online/offline status
 * and provides information about pending offline changes
 */
export function OfflineStatusBanner() {
  const {
    isOnline,
    wasOffline,
    offlineSince,
    onlineSince,
  } = useNetworkStatus();
  
  const [showSyncedMessage, setShowSyncedMessage] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItemsCount, setPendingItemsCount] = useState<Record<string, number>>({});
  
  // Initialize storage for different data types
  const reflectionsStorage = useOfflineStorage<any>('offlineReflections');
  const sessionsStorage = useOfflineStorage<any>('offlineSessions');
  
  useEffect(() => {
    // When coming back online after being offline, show a syncing state
    if (isOnline && wasOffline) {
      syncPendingData();
    }
  }, [isOnline, wasOffline]);
  
  useEffect(() => {
    // Check for pending items when the component mounts and whenever online status changes
    checkPendingItems();
    
    // Set up a periodic check for pending items (every 30 seconds)
    const interval = setInterval(checkPendingItems, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);
  
  const checkPendingItems = async () => {
    try {
      // Only bother checking if the storages are initialized
      if (!reflectionsStorage.isInitialized || !sessionsStorage.isInitialized) {
        return;
      }
      
      // Get counts of pending items
      const reflections = await reflectionsStorage.getItems();
      const sessions = await sessionsStorage.getItems();
      
      setPendingItemsCount({
        reflections: reflections.length,
        sessions: sessions.length,
      });
    } catch (error) {
      console.error('Error checking pending items:', error);
    }
  };
  
  const syncPendingData = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      // Trigger background sync for both data types
      const reflectionsSynced = await reflectionsStorage.triggerSync('sync-reflections');
      const sessionsSynced = await sessionsStorage.triggerSync('sync-sessions');
      
      // Recheck pending items after sync attempt
      await checkPendingItems();
      
      // Show a success message if sync was registered
      if (reflectionsSynced || sessionsSynced) {
        setShowSyncedMessage(true);
        setTimeout(() => setShowSyncedMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const getTotalPendingCount = () => {
    return Object.values(pendingItemsCount).reduce((a, b) => a + b, 0);
  };
  
  const formatTimeSince = (date: Date | null) => {
    if (!date) return '';
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} שניות`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} דקות`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} שעות`;
    return `${Math.floor(seconds / 86400)} ימים`;
  };
  
  // Don't render anything if we're online and there are no pending items
  if (isOnline && !wasOffline && getTotalPendingCount() === 0 && !showSyncedMessage) {
    return null;
  }
  
  // Show different UI based on connection state
  if (!isOnline) {
    return (
      <Alert className="border-orange-400 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 mb-4">
        <WifiOff className="h-5 w-5 text-orange-500 dark:text-orange-400" />
        <AlertTitle className="text-orange-700 dark:text-orange-300">
          מצב לא מקוון
        </AlertTitle>
        <AlertDescription className="text-orange-600 dark:text-orange-400">
          אתה כרגע במצב לא מקוון. השינויים שלך יישמרו מקומית ויסונכרנו כאשר תחזור למצב מקוון.
          {offlineSince && (
            <div className="text-sm mt-1">
              לא מקוון כבר {formatTimeSince(offlineSince)}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (isSyncing) {
    return (
      <Alert className="border-blue-400 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 mb-4">
        <RefreshCw className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-spin" />
        <AlertTitle className="text-blue-700 dark:text-blue-300">
          מסנכרן שינויים...
        </AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          מסנכרן את השינויים שבוצעו במצב לא מקוון.
          <Progress value={60} className="h-1 mt-2" />
        </AlertDescription>
      </Alert>
    );
  }
  
  if (showSyncedMessage) {
    return (
      <Alert className="border-green-400 bg-green-50 dark:bg-green-950 dark:border-green-800 mb-4">
        <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
        <AlertTitle className="text-green-700 dark:text-green-300">
          סנכרון מוצלח
        </AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-400">
          כל השינויים שלך סונכרנו בהצלחה עם השרת.
        </AlertDescription>
      </Alert>
    );
  }
  
  const pendingCount = getTotalPendingCount();
  if (pendingCount > 0) {
    return (
      <Alert className="border-blue-400 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 mb-4">
        <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        <AlertTitle className="text-blue-700 dark:text-blue-300">
          שינויים ממתינים
        </AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          יש לך {pendingCount} שינויים שטרם סונכרנו עם השרת.
          {pendingItemsCount.reflections > 0 && (
            <div className="text-sm">• {pendingItemsCount.reflections} רפלקציות</div>
          )}
          {pendingItemsCount.sessions > 0 && (
            <div className="text-sm">• {pendingItemsCount.sessions} פגישות</div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={syncPendingData}
            disabled={isSyncing || !isOnline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            סנכרן עכשיו
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (wasOffline && onlineSince) {
    return (
      <Alert className="border-green-400 bg-green-50 dark:bg-green-950 dark:border-green-800 mb-4">
        <Wifi className="h-5 w-5 text-green-500 dark:text-green-400" />
        <AlertTitle className="text-green-700 dark:text-green-300">
          חזרת למצב מקוון
        </AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-400">
          החיבור לאינטרנט שוחזר לפני {formatTimeSince(onlineSince)}.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}