import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle,
  History,
  User,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DurationAdjustmentData, adjustSessionDuration, getSessionTimingData, TimerStatus } from '../../services/sessionService';

interface MobileDurationAdjustmentProps {
  sessionId: string;
  sessionStatus: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
  onAdjustmentComplete?: () => void;
  compact?: boolean;
}

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out"
        style={{ 
          transform: `translateY(${currentY}px)`,
          maxHeight: '90vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

interface MobileConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  originalMinutes: number;
  adjustedMinutes: number;
  reason: string;
  isLoading?: boolean;
}

const MobileConfirmationModal: React.FC<MobileConfirmationModalProps> = ({
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
  const isSignificantChange = difference > 10;
  const isIncrease = adjustedMinutes > originalMinutes;

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isSignificantChange ? t('durationAdjustment.confirmSignificantChange') : t('durationAdjustment.confirmAdjustment')}
    >
      <div className="space-y-6">
        {/* Change Summary */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="text-center">
              <div className="text-gray-600 text-xs mb-1">{t('durationAdjustment.originalDuration')}</div>
              <div className="text-2xl font-bold text-gray-900">{originalMinutes}</div>
              <div className="text-xs text-gray-500">{t('common.minutes')}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 text-xs mb-1">{t('durationAdjustment.adjustedDuration')}</div>
              <div className="text-2xl font-bold text-gray-900">{adjustedMinutes}</div>
              <div className="text-xs text-gray-500">{t('common.minutes')}</div>
            </div>
          </div>
          
          <div className="text-center pt-3 border-t border-gray-200">
            <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium ${
              isIncrease ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <span>
                {isIncrease ? '+' : '-'}{difference} {t('common.minutes')} 
                ({isIncrease ? t('durationAdjustment.increase') : t('durationAdjustment.decrease')})
              </span>
            </div>
          </div>
        </div>

        {/* Reason Display */}
        {reason && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="text-sm text-gray-600 mb-2">{t('sessionTimer.adjustmentReason')}:</div>
            <div className="text-gray-700">{reason}</div>
          </div>
        )}

        {/* Warning for Significant Changes */}
        {isSignificantChange && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-800 mb-1">
                  {t('durationAdjustment.significantChangeTitle')}
                </div>
                <div className="text-sm text-yellow-700">
                  {t('durationAdjustment.significantChangeWarning', { difference })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full min-h-[48px] text-white rounded-2xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              isSignificantChange 
                ? 'bg-yellow-600 hover:bg-yellow-700 active:scale-95' 
                : 'bg-gradient-purple shadow-lumea-strong hover:shadow-lumea-glow active:scale-95'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{t('durationAdjustment.confirmAdjustment')}</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full min-h-[48px] bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};

const MobileDurationAdjustment: React.FC<MobileDurationAdjustmentProps> = ({
  sessionId,
  sessionStatus,
  onAdjustmentComplete,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [timerData, setTimerData] = useState<TimerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [showAdjustSheet, setShowAdjustSheet] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [adjustedMinutes, setAdjustedMinutes] = useState(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
    setShowAdjustSheet(true);
    setAdjustedMinutes(timerData?.durationInMinutes || 0);
    setReason('');
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAdjustSheet(false);
    setShowConfirmation(true);
  };

  const handleConfirmAdjustment = async () => {
    if (!timerData) return;

    setAdjusting(true);
    try {
      await adjustSessionDuration(sessionId, {
        adjustedDuration: adjustedMinutes * 60,
        reason: reason.trim() || undefined,
      });
      
      await loadTimerData();
      setShowConfirmation(false);
      onAdjustmentComplete?.();
      
      // Haptic feedback for successful adjustment
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    } catch (error) {
      console.error('Error adjusting duration:', error);
      setError(error instanceof Error ? error.message : 'Failed to adjust duration');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCancelAdjustment = () => {
    setShowAdjustSheet(false);
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
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-center p-4">
          <div className="w-8 h-8 rounded-2xl bg-gradient-purple animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!canAdjust) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-lumea-primary" />
          <div>
            <div className="font-mono font-semibold">
              {timerData?.currentDuration ? formatDuration(timerData.currentDuration) : '00:00'}
            </div>
            <div className="text-xs text-gray-500">
              {timerData?.durationInMinutes || 0} {t('common.minutes')}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleStartAdjustment}
          className="p-2 rounded-xl bg-lumea-light text-lumea-primary hover:bg-lumea-light-dark transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center space-x-2">
            <Clock className="w-5 h-5 text-lumea-primary" />
            <span>{t('durationAdjustment.sessionDuration')}</span>
          </h3>
          
          <button
            onClick={handleStartAdjustment}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Edit className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Duration Display */}
        <div className="text-center p-6 bg-gray-50 rounded-2xl mb-4">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
            {timerData?.currentDuration 
              ? formatDuration(timerData.currentDuration) 
              : '00:00'
            }
          </div>
          <div className="text-gray-600">
            {timerData?.durationInMinutes || 0} {t('common.minutes')} {t('sessionTimer.totalDuration')}
          </div>
        </div>

        {/* Adjustment History Toggle */}
        {timerData?.adjustments && timerData.adjustments.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {t('sessionTimer.adjustments')} ({timerData.adjustmentCount})
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            
            {showHistory && (
              <div className="mt-3 space-y-2">
                {timerData.adjustments.slice(-3).map((adjustment, index) => (
                  <div key={index} className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {Math.round(adjustment.originalDuration / 60)} → {Math.round(adjustment.adjustedDuration / 60)} {t('common.minutes')}
                      </span>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <User className="w-3 h-3" />
                        <span className="text-xs">{adjustment.adjustedBy.firstName}</span>
                      </div>
                    </div>
                    {adjustment.reason && (
                      <div className="text-xs text-gray-600">{adjustment.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustment Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showAdjustSheet}
        onClose={handleCancelAdjustment}
        title={t('sessionTimer.adjustDuration')}
      >
        <form onSubmit={handleSubmitAdjustment} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('sessionTimer.durationMinutes')}
            </label>
            <input
              type="number"
              min="1"
              max="480"
              step="1"
              value={adjustedMinutes}
              onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent text-lg"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('durationAdjustment.durationRange')}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('sessionTimer.adjustmentReason')} ({t('common.optional')})
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('sessionTimer.adjustmentReasonPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-2">
              {reason.length}/500 {t('durationAdjustment.characters')}
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              type="submit"
              disabled={adjustedMinutes < 1 || adjustedMinutes > 480}
              className="w-full min-h-[48px] bg-gradient-purple text-white rounded-2xl font-medium shadow-lumea-strong hover:shadow-lumea-glow transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{t('durationAdjustment.reviewAdjustment')}</span>
            </button>
            
            <button
              type="button"
              onClick={handleCancelAdjustment}
              className="w-full min-h-[48px] bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </MobileBottomSheet>

      {/* Confirmation Modal */}
      <MobileConfirmationModal
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

export default MobileDurationAdjustment; 