import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Edit,
  RotateCcw,
  X,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { useAuth } from '../../contexts/AuthContext';
import { DurationAdjustmentData } from '../../services/sessionService';

interface MobileSessionTimerProps {
  sessionId: string;
  sessionStatus: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
  onTimerStateChange?: (isActive: boolean) => void;
  compact?: boolean;
}

interface MobileDurationAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (data: DurationAdjustmentData) => Promise<void>;
  currentDuration: number;
  isLoading?: boolean;
}

// Enhanced mobile utilities
class MobileTimerOptimizer {
  private static wakeLock: any = null;
  private static isOnline = navigator.onLine;
  private static backgroundStartTime: number | null = null;

  // Haptic feedback support
  static triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [200],
        selection: [10]
      };
      navigator.vibrate(patterns[type]);
    }
    
    // iOS haptic feedback
    if ('Haptics' in window && (window as any).Haptics) {
      try {
        switch (type) {
          case 'light':
            (window as any).Haptics.impact({ style: 'light' });
            break;
          case 'medium':
            (window as any).Haptics.impact({ style: 'medium' });
            break;
          case 'heavy':
            (window as any).Haptics.impact({ style: 'heavy' });
            break;
          case 'selection':
            (window as any).Haptics.selection();
            break;
        }
      } catch (e) {
        console.log('Haptic feedback not available');
      }
    }
  }

  // Wake lock for keeping screen on during active timer
  static async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Screen wake lock activated');
        return true;
      } catch (err) {
        console.log('Wake lock failed:', err);
        return false;
      }
    }
    return false;
  }

  static async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Screen wake lock released');
      } catch (err) {
        console.log('Wake lock release failed:', err);
      }
    }
  }

  // Network status monitoring
  static initNetworkMonitoring(onStatusChange: (isOnline: boolean) => void) {
    const handleOnline = () => {
      this.isOnline = true;
      onStatusChange(true);
    };
    
    const handleOffline = () => {
      this.isOnline = false;
      onStatusChange(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Background timer handling for PWA
  static handleVisibilityChange(isTimerRunning: boolean, currentDuration: number) {
    if (document.hidden && isTimerRunning) {
      this.backgroundStartTime = Date.now();
      // Store in localStorage for PWA persistence
      localStorage.setItem('timerBackgroundStart', this.backgroundStartTime.toString());
      localStorage.setItem('timerDurationAtBackground', currentDuration.toString());
    } else if (!document.hidden && this.backgroundStartTime) {
      const backgroundDuration = Date.now() - this.backgroundStartTime;
      this.backgroundStartTime = null;
      localStorage.removeItem('timerBackgroundStart');
      localStorage.removeItem('timerDurationAtBackground');
      return backgroundDuration;
    }
    return 0;
  }

  // Performance optimization: reduce updates when not visible
  static getOptimalRefreshInterval(isVisible: boolean, isTimerRunning: boolean): number {
    if (!isVisible) return 5000; // Slow refresh when hidden
    if (isTimerRunning) return 1000; // Standard refresh when active
    return 3000; // Slower refresh when stopped
  }
}

const MobileDurationAdjustmentModal: React.FC<MobileDurationAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjust,
  currentDuration,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [adjustedMinutes, setAdjustedMinutes] = useState(Math.round(currentDuration / 60));
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdjust({
      adjustedDuration: adjustedMinutes * 60,
      reason: reason.trim() || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold">{t('sessionTimer.adjustDuration')}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('sessionTimer.durationMinutes')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={adjustedMinutes}
                  onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
                  required
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {t('common.minutes')}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('sessionTimer.adjustmentReason')} ({t('common.optional')})
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('sessionTimer.adjustmentReasonPlaceholder')}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading || adjustedMinutes < 1}
                className="flex-1 px-6 py-4 bg-lumea-primary text-white rounded-xl hover:bg-lumea-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.saving')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>{t('sessionTimer.adjust')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const MobileSessionTimer: React.FC<MobileSessionTimerProps> = ({
  sessionId,
  sessionStatus,
  onTimerStateChange,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [backgroundDuration, setBackgroundDuration] = useState(0);
  const wakeLockRef = useRef<boolean>(false);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  const {
    timerData,
    isLoading,
    error,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    adjustDuration,
    formatDuration,
    isTimerActive,
  } = useSessionTimer({
    sessionId,
    autoRefresh: true,
    refreshInterval: 1000, // Use standard interval, will be optimized in effect
    onTimerUpdate: (data) => {
      onTimerStateChange?.(data.timerStatus === 'running' || data.timerStatus === 'paused');
    },
    onError: (error) => {
      console.error('Timer error:', error);
    },
  });

  // Mobile optimizations and PWA features
  useEffect(() => {
    // Network status monitoring
    const cleanupNetwork = MobileTimerOptimizer.initNetworkMonitoring(setIsOnline);

    // Visibility change handling for background timer
    const handleVisibilityChange = () => {
      const wasVisible = isVisible;
      const nowVisible = !document.hidden;
      setIsVisible(nowVisible);

      if (wasVisible && !nowVisible && isTimerActive) {
        // Going to background with active timer
        const extraDuration = MobileTimerOptimizer.handleVisibilityChange(
          isTimerActive, 
          timerData?.currentDuration || 0
        );
        setBackgroundDuration(extraDuration);
      } else if (!wasVisible && nowVisible && isTimerActive) {
        // Coming from background with active timer
        const extraDuration = MobileTimerOptimizer.handleVisibilityChange(
          isTimerActive, 
          timerData?.currentDuration || 0
        );
        if (extraDuration > 0) {
          setBackgroundDuration(extraDuration);
        }
      }
    };

    visibilityHandlerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanupNetwork();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVisible, isTimerActive, timerData?.currentDuration]);

  // Wake lock management
  useEffect(() => {
    if (isTimerActive && timerData?.timerStatus === 'running' && !wakeLockRef.current) {
      MobileTimerOptimizer.requestWakeLock().then((success) => {
        wakeLockRef.current = success;
      });
    } else if ((!isTimerActive || timerData?.timerStatus !== 'running') && wakeLockRef.current) {
      MobileTimerOptimizer.releaseWakeLock();
      wakeLockRef.current = false;
    }

    return () => {
      if (wakeLockRef.current) {
        MobileTimerOptimizer.releaseWakeLock();
        wakeLockRef.current = false;
      }
    };
  }, [isTimerActive, timerData?.timerStatus]);

  const isCoach = profile?.role === 'coach';
  const canStart = isCoach && sessionStatus !== 'completed' && sessionStatus !== 'cancelled';
  const canStop = isCoach && isTimerActive;
  const canPause = isCoach && timerData?.timerStatus === 'running';
  const canResume = isCoach && timerData?.timerStatus === 'paused';
  const canAdjust = isCoach && timerData?.timerStatus === 'stopped' && timerData?.hasTimer;

  const handleAdjustDuration = async (adjustmentData: DurationAdjustmentData) => {
    setIsAdjusting(true);
    try {
      await adjustDuration(adjustmentData);
      MobileTimerOptimizer.triggerHapticFeedback('medium');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Enhanced timer control functions with haptic feedback
  const handleStartTimer = useCallback(async () => {
    try {
      await startTimer();
      MobileTimerOptimizer.triggerHapticFeedback('medium');
    } catch (error) {
      console.error('Start timer failed:', error);
      MobileTimerOptimizer.triggerHapticFeedback('heavy');
    }
  }, [startTimer]);

  const handleStopTimer = useCallback(async () => {
    try {
      await stopTimer();
      MobileTimerOptimizer.triggerHapticFeedback('heavy');
    } catch (error) {
      console.error('Stop timer failed:', error);
      MobileTimerOptimizer.triggerHapticFeedback('heavy');
    }
  }, [stopTimer]);

  const handlePauseTimer = useCallback(async () => {
    try {
      await pauseTimer();
      MobileTimerOptimizer.triggerHapticFeedback('light');
    } catch (error) {
      console.error('Pause timer failed:', error);
      MobileTimerOptimizer.triggerHapticFeedback('heavy');
    }
  }, [pauseTimer]);

  const handleResumeTimer = useCallback(async () => {
    try {
      await resumeTimer();
      MobileTimerOptimizer.triggerHapticFeedback('medium');
    } catch (error) {
      console.error('Resume timer failed:', error);
      MobileTimerOptimizer.triggerHapticFeedback('heavy');
    }
  }, [resumeTimer]);

  const getTimerStatusIcon = () => {
    if (!timerData?.hasTimer) return <Clock className="w-6 h-6 text-gray-400" />;
    
    switch (timerData.timerStatus) {
      case 'running':
        return <Play className="w-6 h-6 text-green-500" fill="currentColor" />;
      case 'paused':
        return <Pause className="w-6 h-6 text-yellow-500" fill="currentColor" />;
      case 'stopped':
        return <Square className="w-6 h-6 text-gray-500" fill="currentColor" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!timerData?.hasTimer) return 'text-gray-500';
    
    switch (timerData.timerStatus) {
      case 'running':
        return 'text-green-600';
      case 'paused':
        return 'text-yellow-600';
      case 'stopped':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  if (!isCoach && !timerData?.hasTimer) {
    return null;
  }

  // Compact version for session cards
  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
        {getTimerStatusIcon()}
        <div className="flex-1">
          <div className={`text-lg font-mono font-bold ${getStatusColor()}`}>
            {timerData?.currentDuration ? formatDuration(timerData.currentDuration) : '00:00'}
          </div>
          {timerData?.timerStatus === 'paused' && (
            <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full inline-block mt-1">
              {t('sessionTimer.paused')}
            </div>
          )}
        </div>
        
        {/* Quick Controls */}
        {isCoach && (
          <div className="flex space-x-2">
            {timerData?.timerStatus === 'stopped' || !timerData?.hasTimer ? (
              <button
                onClick={handleStartTimer}
                disabled={!canStart || isLoading}
                className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 touch-manipulation"
              >
                <Play className="w-5 h-5" fill="currentColor" />
              </button>
            ) : (
              <>
                {canPause && (
                  <button
                    onClick={handlePauseTimer}
                    disabled={isLoading}
                    className="p-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    <Pause className="w-5 h-5" fill="currentColor" />
                  </button>
                )}
                
                {canResume && (
                  <button
                    onClick={handleResumeTimer}
                    disabled={isLoading}
                    className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
                
                {canStop && (
                  <button
                    onClick={handleStopTimer}
                    disabled={isLoading}
                    className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    <Square className="w-5 h-5" fill="currentColor" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mobile timer interface
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Clock className="w-5 h-5 text-lumea-primary" />
          <span>{t('sessionTimer.sessionTimer')}</span>
          
          {/* Network Status Indicator */}
          {!isOnline && (
            <div className="ml-2 p-1 bg-red-100 rounded-full">
              <WifiOff className="w-4 h-4 text-red-600" />
            </div>
          )}
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Background Timer Notification */}
          {backgroundDuration > 0 && (
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              +{Math.round(backgroundDuration / 1000)}s
            </div>
          )}
          
          {canAdjust && (
            <button
              onClick={() => setShowAdjustModal(true)}
              disabled={isLoading}
              className="p-2 bg-lumea-light text-lumea-primary rounded-xl hover:bg-lumea-light-dark transition-colors disabled:opacity-50 touch-manipulation"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {getTimerStatusIcon()}
          <div className="text-5xl font-mono font-bold tracking-wider">
            {timerData?.currentDuration 
              ? formatDuration(timerData.currentDuration) 
              : '00:00:00'
            }
          </div>
        </div>
        
        {timerData?.timerStatus && (
          <div className={`text-base font-medium ${getStatusColor()} mb-2`}>
            {t(`sessionTimer.status.${timerData.timerStatus}`)}
          </div>
        )}

        {timerData?.pauseCount > 0 && (
          <div className="text-sm text-gray-500">
            {t('sessionTimer.pauseCount', { count: timerData.pauseCount })} • 
            {t('sessionTimer.pausedTime', { 
              time: formatDuration(timerData.totalPausedTime) 
            })}
          </div>
        )}
      </div>

      {/* Mobile Timer Controls */}
      {isCoach && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {timerData?.timerStatus === 'stopped' || !timerData?.hasTimer ? (
            <button
              onClick={handleStartTimer}
              disabled={!canStart || isLoading}
              className="col-span-2 flex items-center justify-center space-x-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-lg font-medium"
            >
              <Play className="w-6 h-6" fill="currentColor" />
              <span>{t('sessionTimer.start')}</span>
            </button>
          ) : (
            <>
              {canPause && (
                <button
                  onClick={handlePauseTimer}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-4 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors disabled:opacity-50 touch-manipulation font-medium"
                >
                  <Pause className="w-5 h-5" fill="currentColor" />
                  <span>{t('sessionTimer.pause')}</span>
                </button>
              )}
              
              {canResume && (
                <button
                  onClick={handleResumeTimer}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 touch-manipulation font-medium"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>{t('sessionTimer.resume')}</span>
                </button>
              )}
              
              {canStop && (
                <button
                  onClick={handleStopTimer}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 touch-manipulation font-medium"
                >
                  <Square className="w-5 h-5" fill="currentColor" />
                  <span>{t('sessionTimer.stop')}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Session Information */}
      {timerData?.hasTimer && (
        <div className="pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('sessionTimer.totalDuration')}:</span>
              <span className="font-medium">
                {timerData.durationInMinutes}m
              </span>
            </div>
            
            {timerData.adjustmentCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('sessionTimer.adjustments')}:</span>
                <span className="font-medium">{timerData.adjustmentCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Duration Adjustment Modal */}
      <MobileDurationAdjustmentModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        onAdjust={handleAdjustDuration}
        currentDuration={timerData?.totalDuration || 0}
        isLoading={isAdjusting}
      />
    </div>
  );
};

export default MobileSessionTimer; 