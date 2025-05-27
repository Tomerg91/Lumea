import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle,
  History,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DurationAdjustmentData, adjustSessionDuration, getSessionTimingData, TimerStatus } from '../services/sessionService';

interface DurationAdjustmentProps {
  sessionId: string;
  sessionStatus: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
  onAdjustmentComplete?: () => void;
  className?: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  originalMinutes: number;
  adjustedMinutes: number;
  reason: string;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originalMinutes,
  adjustedMinutes,
  reason,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  
  const difference = Math.abs(adjustedMinutes - originalMinutes);
  const isSignificantChange = difference > 10; // More than 10 minutes
  const isIncrease = adjustedMinutes > originalMinutes;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className={`w-6 h-6 ${isSignificantChange ? 'text-yellow-500' : 'text-blue-500'}`} />
          <h3 className="text-lg font-semibold">
            {isSignificantChange ? t('durationAdjustment.confirmSignificantChange') : t('durationAdjustment.confirmAdjustment')}
          </h3>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{t('durationAdjustment.originalDuration')}:</span>
                <span className="ml-2 font-semibold">{originalMinutes} {t('common.minutes')}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('durationAdjustment.adjustedDuration')}:</span>
                <span className="ml-2 font-semibold">{adjustedMinutes} {t('common.minutes')}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className={`flex items-center space-x-2 ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                <span className="text-sm font-medium">
                  {isIncrease ? '+' : '-'}{difference} {t('common.minutes')} 
                  ({isIncrease ? t('durationAdjustment.increase') : t('durationAdjustment.decrease')})
                </span>
              </div>
            </div>
          </div>

          {reason && (
            <div>
              <span className="text-sm text-gray-600">{t('sessionTimer.adjustmentReason')}:</span>
              <div className="mt-1 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                {reason}
              </div>
            </div>
          )}

          {isSignificantChange && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                {t('durationAdjustment.significantChangeWarning', { difference })}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 ${
              isSignificantChange 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-lumea-primary hover:bg-lumea-primary-dark'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('durationAdjustment.confirmAdjustment')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const DurationAdjustment: React.FC<DurationAdjustmentProps> = ({
  sessionId,
  sessionStatus,
  onAdjustmentComplete,
  className = '',
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [timerData, setTimerData] = useState<TimerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [adjustedMinutes, setAdjustedMinutes] = useState(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isCoach = profile?.role === 'coach';
  const canAdjust = isCoach && (timerData?.hasTimer || sessionStatus === 'completed');

  useEffect(() => {
    loadTimerData();
  }, [sessionId]);

  const loadTimerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSessionTimingData(sessionId);
      setTimerData(data);
      setAdjustedMinutes(data.durationInMinutes);
    } catch (error) {
      console.error('Error loading timer data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load timing data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAdjustment = () => {
    setShowAdjustForm(true);
    setAdjustedMinutes(timerData?.durationInMinutes || 0);
    setReason('');
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAdjustForm(false);
    setShowConfirmation(true);
  };

  const handleConfirmAdjustment = async () => {
    if (!timerData) return;

    setAdjusting(true);
    try {
      await adjustSessionDuration(sessionId, {
        adjustedDuration: adjustedMinutes * 60, // Convert to seconds
        reason: reason.trim() || undefined,
      });
      
      await loadTimerData(); // Reload to get updated data
      setShowConfirmation(false);
      onAdjustmentComplete?.();
    } catch (error) {
      console.error('Error adjusting duration:', error);
      setError(error instanceof Error ? error.message : 'Failed to adjust duration');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCancelAdjustment = () => {
    setShowAdjustForm(false);
    setShowConfirmation(false);
    setAdjustedMinutes(timerData?.durationInMinutes || 0);
    setReason('');
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin h-6 w-6 border-2 border-lumea-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!canAdjust) {
    return null; // Don't show for clients or non-coaches
  }

  return (
    <>
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Clock className="w-5 h-5 text-lumea-primary" />
            <span>{t('durationAdjustment.sessionDuration')}</span>
          </h3>
          
          {canAdjust && !showAdjustForm && (
            <button
              onClick={handleStartAdjustment}
              className="flex items-center space-x-2 px-3 py-1.5 bg-lumea-light text-lumea-primary rounded-lg hover:bg-lumea-light-dark transition-colors text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              <span>{t('sessionTimer.adjust')}</span>
            </button>
          )}
        </div>

        {!showAdjustForm ? (
          <div className="space-y-4">
            {/* Current Duration Display */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-mono font-bold text-gray-900 mb-1">
                {timerData?.currentDuration 
                  ? formatDuration(timerData.currentDuration) 
                  : '00:00'
                }
              </div>
              <div className="text-sm text-gray-600">
                {timerData?.durationInMinutes || 0} {t('common.minutes')} {t('sessionTimer.totalDuration')}
              </div>
            </div>

            {/* Adjustment History */}
            {timerData?.adjustments && timerData.adjustments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                  <History className="w-4 h-4" />
                  <span>{t('sessionTimer.adjustments')} ({timerData.adjustmentCount})</span>
                </h4>
                <div className="space-y-2">
                  {timerData.adjustments.slice(-3).map((adjustment, index) => (
                    <div key={index} className="text-xs bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {Math.round(adjustment.originalDuration / 60)} → {Math.round(adjustment.adjustedDuration / 60)} {t('common.minutes')}
                        </span>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{adjustment.adjustedBy.firstName} {adjustment.adjustedBy.lastName}</span>
                        </div>
                      </div>
                      {adjustment.reason && (
                        <div className="text-gray-600 mt-1">{adjustment.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmitAdjustment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sessionTimer.durationMinutes')}
              </label>
              <input
                type="number"
                min="1"
                max="480"
                step="1"
                value={adjustedMinutes}
                onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('durationAdjustment.durationRange')}
              </p>
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
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/500 {t('durationAdjustment.characters')}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancelAdjustment}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={adjustedMinutes < 1 || adjustedMinutes > 480}
                className="px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-primary-dark transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t('durationAdjustment.reviewAdjustment')}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCancelAdjustment}
        onConfirm={handleConfirmAdjustment}
        originalMinutes={timerData?.durationInMinutes || 0}
        adjustedMinutes={adjustedMinutes}
        reason={reason}
        isLoading={adjusting}
      />
    </>
  );
};

export default DurationAdjustment; 