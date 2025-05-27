import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, Wifi, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const Offline: React.FC = () => {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'checking' | 'online'>('offline');
  
  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };
    
    // Set initial status
    updateOnlineStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  
  // Auto-refresh when back online
  useEffect(() => {
    if (connectionStatus === 'online') {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);
  
  const handleRetry = async () => {
    setIsRetrying(true);
    setConnectionStatus('checking');
    
    try {
      // Test connection with a lightweight request
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setConnectionStatus('online');
        // Reload page on successful connection
        window.location.reload();
      } else {
        setConnectionStatus('offline');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('offline');
    } finally {
      setIsRetrying(false);
    }
  };
  
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'online':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'checking':
        return <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />;
      default:
        return <WifiOff className="w-8 h-8 text-gray-400" />;
    }
  };
  
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'online':
        return 'Connection restored! Reloading...';
      case 'checking':
        return 'Checking connection...';
      default:
        return 'You are currently offline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            <div className={cn(
              'p-4 rounded-full',
              connectionStatus === 'online' ? 'bg-green-100' :
              connectionStatus === 'checking' ? 'bg-blue-100' :
              'bg-gray-100'
            )}>
              {getStatusIcon()}
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {connectionStatus === 'online' ? 'Back Online!' : 'No Internet Connection'}
          </h1>
          
          {/* Status Message */}
          <p className="text-gray-600 mb-6">
            {getStatusText()}
          </p>
          
          {/* Connection Details */}
          {connectionStatus === 'offline' && (
            <div className="text-sm text-gray-500 mb-8">
              <p className="mb-2">
                Please check your internet connection and try again.
              </p>
              <p>
                Some features may still be available from cached data.
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3">
            {connectionStatus !== 'online' && (
              <button
                onClick={handleRetry}
                disabled={isRetrying || connectionStatus === 'checking'}
                className={cn(
                  'w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200',
                  isRetrying || connectionStatus === 'checking'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                )}
              >
                <RefreshCw className={cn(
                  'w-5 h-5',
                  isRetrying || connectionStatus === 'checking' ? 'animate-spin' : ''
                )} />
                <span>
                  {isRetrying || connectionStatus === 'checking' ? 'Checking...' : 'Try Again'}
                </span>
              </button>
            )}
            
            {/* Browse Cached Content */}
            <button
              onClick={() => window.history.back()}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
            >
              <Wifi className="w-5 h-5" />
              <span>Browse Cached Content</span>
            </button>
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Lumea works best with an internet connection, but you can still:
          </p>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>View cached sessions and reflections</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Draft new reflections (will sync when online)</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span>Limited functionality without internet</span>
            </div>
          </div>
        </div>
        
        {/* Connection Status Indicator */}
        <div className="mt-6 flex items-center justify-center space-x-2">
          <div className={cn(
            'w-3 h-3 rounded-full transition-colors duration-300',
            connectionStatus === 'online' ? 'bg-green-500' :
            connectionStatus === 'checking' ? 'bg-blue-500' :
            'bg-red-500'
          )}></div>
          <span className="text-sm text-gray-500">
            {connectionStatus === 'online' ? 'Connected' :
             connectionStatus === 'checking' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Offline; 