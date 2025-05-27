import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Edit,
  RotateCcw
} from 'lucide-react';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { DurationAdjustmentData } from '../services/sessionService';

interface SessionTimerProps {
  sessionId: string;
  sessionStatus: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
  onTimerStateChange?: (isActive: boolean) => void;
  compact?: boolean; // For compact display in session lists
  className?: string;
}

interface DurationAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (data: DurationAdjustmentData) => Promise<void>;
  currentDuration: number; // in seconds
  isLoading?: boolean;
}

const DurationAdjustmentModal: React.FC<DurationAdjustmentModalProps> = ({
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
      adjustedDuration: adjustedMinutes * 60, // Convert to seconds
      reason: reason.trim() || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{t('sessionTimer.adjustDuration')}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessionTimer.durationMinutes')}
            </label>
            <input
              type="number"
              min="1"
              max="480"
              value={adjustedMinutes}
              onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessionTimer.adjustmentReason')} ({t('common.optional')})
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('sessionTimer.adjustmentReasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
              rows={3}
              maxLength={500}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || adjustedMinutes < 1}
              className="px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-primary-dark transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('sessionTimer.adjustDuration')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SessionTimer: React.FC<SessionTimerProps> = ({
  sessionId,
  sessionStatus,
  onTimerStateChange,
  compact = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

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
    canControlTimer,
  } = useSessionTimer({
    sessionId,
    autoRefresh: true,
    refreshInterval: 1000,
    onTimerUpdate: (data) => {
      onTimerStateChange?.(data.timerStatus === 'running' || data.timerStatus === 'paused');
    },
    onError: (error) => {
      console.error('Timer error:', error);
    },
  });

  // Only coaches can control the timer
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
    } finally {
      setIsAdjusting(false);
    }
  };

  const getTimerStatusIcon = () => {
    if (!timerData?.hasTimer) return <Clock className="w-5 h-5 text-gray-400" />;
    
    switch (timerData.timerStatus) {
      case 'running':
        return <Play className="w-5 h-5 text-green-500" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      case 'stopped':
        return <Square className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTimerStatusColor = () => {
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
    return null; // Don't show anything for clients if no timer data
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getTimerStatusIcon()}
        <span className={`text-sm font-mono ${getTimerStatusColor()}`}>
          {timerData?.currentDuration ? formatDuration(timerData.currentDuration) : '00:00'}
        </span>
        {timerData?.timerStatus === 'paused' && (
          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
            {t('sessionTimer.paused')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Clock className="w-5 h-5 text-lumea-primary" />
          <span>{t('sessionTimer.sessionTimer')}</span>
        </h3>
        
        {error && (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{t('sessionTimer.error')}</span>
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-3 mb-2">
          {getTimerStatusIcon()}
          <div className="text-4xl font-mono font-bold tracking-wide">
            {timerData?.currentDuration 
              ? formatDuration(timerData.currentDuration) 
              : '00:00:00'
            }
          </div>
        </div>
        
        {timerData?.timerStatus && (
          <div className={`text-sm font-medium ${getTimerStatusColor()}`}>
            {t(`sessionTimer.status.${timerData.timerStatus}`)}
          </div>
        )}

        {timerData?.pauseCount > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {t('sessionTimer.pauseCount', { count: timerData.pauseCount })} • 
            {t('sessionTimer.pausedTime', { 
              time: formatDuration(timerData.totalPausedTime) 
            })}
          </div>
        )}
      </div>

      {/* Timer Controls */}
      {isCoach && (
        <div className="flex flex-wrap gap-2 justify-center">
          {timerData?.timerStatus === 'stopped' || !timerData?.hasTimer ? (
            <button
              onClick={startTimer}
              disabled={!canStart || isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>{t('sessionTimer.start')}</span>
            </button>
          ) : (
            <>
              {canPause && (
                <button
                  onClick={pauseTimer}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  <span>{t('sessionTimer.pause')}</span>
                </button>
              )}
              
              {canResume && (
                <button
                  onClick={resumeTimer}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('sessionTimer.resume')}</span>
                </button>
              )}
              
              {canStop && (
                <button
                  onClick={stopTimer}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  <span>{t('sessionTimer.stop')}</span>
                </button>
              )}
            </>
          )}

          {canAdjust && (
            <button
              onClick={() => setShowAdjustModal(true)}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-primary-dark transition-colors disabled:opacity-50"
            >
              <Edit className="w-4 h-4" />
              <span>{t('sessionTimer.adjust')}</span>
            </button>
          )}
        </div>
      )}

      {/* Session Information */}
      {timerData?.hasTimer && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">{t('sessionTimer.totalDuration')}:</span>
              <span className="ml-2 font-medium">
                {timerData.durationInMinutes} {t('common.minutes')}
              </span>
            </div>
            
            {timerData.adjustmentCount > 0 && (
              <div>
                <span className="text-gray-600">{t('sessionTimer.adjustments')}:</span>
                <span className="ml-2 font-medium">{timerData.adjustmentCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Duration Adjustment Modal */}
      <DurationAdjustmentModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        onAdjust={handleAdjustDuration}
        currentDuration={timerData?.totalDuration || 0}
        isLoading={isAdjusting}
      />
    </div>
  );
};

export default SessionTimer; 