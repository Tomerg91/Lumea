import { useIsOnline } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Network status indicator for use in mobile applications
 * Shows a banner when the device goes offline and displays a small indicator
 * in the corner when online/offline
 */
export function NetworkStatus() {
  const isOnline = useIsOnline();
  const [showBanner, setShowBanner] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Only show initial banner if user is offline when the app loads
  useEffect(() => {
    setIsMounted(true);
    if (!isOnline) {
      setShowBanner(true);
    }
  }, []);

  // Show banner briefly when network status changes
  useEffect(() => {
    if (!isMounted) return;
    
    setShowBanner(true);
    const timer = setTimeout(() => {
      setShowBanner(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOnline, isMounted]);

  return (
    <>
      {/* Status Indicator */}
      <div className={cn(
        "fixed bottom-20 left-4 z-50 flex items-center justify-center rounded-full p-2 shadow-md transition-all duration-300",
        isOnline 
          ? "bg-green-100 text-green-600" 
          : "bg-red-100 text-red-600"
      )}>
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
      </div>

      {/* Network Status Banner */}
      <div className={cn(
        "fixed left-0 right-0 top-0 z-50 translate-y-0 transform p-3 text-center text-sm font-medium transition-transform duration-300",
        showBanner ? "translate-y-0" : "-translate-y-full",
        isOnline 
          ? "bg-green-100 text-green-800" 
          : "bg-red-100 text-red-800"
      )}>
        {isOnline 
          ? "מחובר לאינטרנט" // Connected to the internet
          : "אין חיבור לאינטרנט. מציג מידע במצב לא מקוון." // No internet connection. Showing data in offline mode.
        }
      </div>
    </>
  );
}