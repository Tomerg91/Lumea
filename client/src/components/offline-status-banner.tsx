import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Component that displays the current online/offline status
 * Simplified version for debugging
 */
export function OfflineStatusBanner() {
  // Temporarily simplified banner for debugging
  // We'll use the browser's built-in navigator.onLine instead of our custom hook
  const isOnline = navigator.onLine;
  
  // Only show a banner if we're offline
  if (!isOnline) {
    return (
      <Alert className="border-orange-400 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 mb-4">
        <WifiOff className="h-5 w-5 text-orange-500 dark:text-orange-400" />
        <AlertTitle className="text-orange-700 dark:text-orange-300">
          מצב לא מקוון
        </AlertTitle>
        <AlertDescription className="text-orange-600 dark:text-orange-400">
          אתה כרגע במצב לא מקוון. חלק מהיכולות עשויות להיות מוגבלות.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Don't show anything if we're online
  return null;
}