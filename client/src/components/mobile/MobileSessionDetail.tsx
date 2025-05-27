import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit3, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Save, 
  X,
  MoreVertical,
  Check
} from 'lucide-react';
import { Session } from '../SessionList';
import { fetchSessionById, updateSession } from '../../services/sessionService';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { cn } from '../../lib/utils';
import MobileSessionTimer from './MobileSessionTimer';

// Mobile-optimized status configuration
const mobileStatusConfig = {
  pending: {
    label: 'sessions.status.pending',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-400',
    icon: '⏳',
  },
  'in-progress': {
    label: 'sessions.status.inProgress',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-400',
    icon: '🟢',
  },
  completed: {
    label: 'sessions.status.completed',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-400',
    icon: '✅',
  },
  cancelled: {
    label: 'sessions.status.cancelled',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-400',
    icon: '❌',
  },
};

// Mobile Status Badge Component
const MobileStatusBadge: React.FC<{ status: Session['status'] }> = ({ status }) => {
  const { t } = useTranslation();
  const config = mobileStatusConfig[status];
  
  return (
    <div className={cn(
      'inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium border',
      config.bgColor,
      config.textColor,
      config.borderColor
    )}>
      <div className={cn('w-2 h-2 rounded-full mr-2', config.dotColor)} />
      {t(config.label)}
    </div>
  );
};

// Bottom Sheet Modal Component
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
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
        <div className="px-6 py-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  variant = 'secondary' 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 min-h-[48px]',
        variant === 'primary' 
          ? 'bg-gradient-purple text-white shadow-lumea-strong hover:shadow-lumea-glow active:scale-95'
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95'
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
};

interface ExtendedSession extends Session {
  coach?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const MobileSessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  const [session, setSession] = useState<ExtendedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    date: '',
    notes: '',
  });

  // Auto-save functionality
  const triggerAutoSave = (field: string, value: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(() => {
      handleAutoSave(field, value);
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    setAutoSaveTimeout(timeout);
  };

  const handleAutoSave = async (field: string, value: string) => {
    if (!session || !sessionId) return;
    
    try {
      const updateData: any = {};
      updateData[field] = field === 'date' ? new Date(value).toISOString() : value;
      
      const updatedSession = await updateSession(sessionId, updateData);
      setSession(updatedSession);
      
      // Haptic feedback for successful save
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMMM d, yyyy', { locale });
    } catch (error) {
      return t('sessions.invalidDate');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm', { locale });
    } catch (error) {
      return '';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm", { locale });
    } catch (error) {
      return '';
    }
  };

  const handleBackClick = () => {
    const basePath = profile?.role === 'coach' ? '/coach/sessions' : '/client/sessions';
    navigate(basePath);
  };

  const handleEditClick = () => {
    if (session) {
      setEditForm({
        date: formatDateTime(session.date),
        notes: session.notes || '',
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!session || !sessionId) return;

    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Only include changed fields
      if (editForm.date !== formatDateTime(session.date)) {
        updateData.date = new Date(editForm.date).toISOString();
      }
      
      if (editForm.notes !== (session.notes || '')) {
        updateData.notes = editForm.notes;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedSession = await updateSession(sessionId, updateData);
        setSession(updatedSession);
        
        // Haptic feedback for successful save
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }
      
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating session:', error);
      setError(error instanceof Error ? error.message : 'Failed to update session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCallClient = () => {
    if (session?.client.email) {
      // In a real app, this would integrate with the device's phone app
      window.location.href = `tel:${session.client.email}`;
    }
    setIsActionsModalOpen(false);
  };

  const handleMessageClient = () => {
    if (session?.client.email) {
      // In a real app, this would integrate with messaging
      window.location.href = `sms:${session.client.email}`;
    }
    setIsActionsModalOpen(false);
  };

  const canEdit = () => {
    return profile?.role === 'coach' && session && 
           (session.status === 'pending' || session.status === 'in-progress');
  };

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError('Session ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const sessionData = await fetchSessionById(sessionId);
        setSession(sessionData);
      } catch (error) {
        console.error('Error loading session:', error);
        setError(error instanceof Error ? error.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  if (!isMobile) {
    return null; // This component is mobile-only
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-purple animate-pulse" />
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mt-8">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={handleBackClick}
            className="btn-primary"
          >
            {t('sessions.backToSessions')}
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center mt-16">
          <h3 className="text-lg font-medium mb-4">Session not found</h3>
          <button
            onClick={handleBackClick}
            className="btn-primary"
          >
            {t('sessions.backToSessions')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBackClick}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="font-semibold text-lg truncate mx-4">
            {session.client.firstName} {session.client.lastName}
          </h1>
          
          <button
            onClick={() => setIsActionsModalOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Session Content */}
      <div className="p-4 space-y-4">
        {/* Session Overview Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <MobileStatusBadge status={session.status} />
            {canEdit() && (
              <button
                onClick={handleEditClick}
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Edit3 className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="font-medium">{formatDate(session.date)}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">{formatTime(session.date)}</span>
            </div>
          </div>
        </div>

        {/* Session Timer */}
        <MobileSessionTimer
          sessionId={sessionId!}
          sessionStatus={session.status}
        />

        {/* Client Information Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">{t('sessions.client')}</h3>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-purple flex items-center justify-center">
              <span className="text-white font-semibold">
                {session.client.firstName.charAt(0)}
                {session.client.lastName.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {session.client.firstName} {session.client.lastName}
              </div>
              <div className="text-gray-500 text-sm">{session.client.email}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions (Coach Only) */}
        {profile?.role === 'coach' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4">{t('sessions.quickActions')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton
                icon={<Phone className="w-5 h-5" />}
                label={t('sessions.callClient')}
                onClick={handleCallClient}
              />
              <QuickActionButton
                icon={<MessageSquare className="w-5 h-5" />}
                label={t('sessions.messageClient')}
                onClick={handleMessageClient}
              />
            </div>
          </div>
        )}

        {/* Session Notes Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">{t('sessions.notes')}</h3>
          {session.notes ? (
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {session.notes}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              {t('sessions.noNotes')}
            </p>
          )}
        </div>

        {/* Session Information Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">{t('sessions.sessionInfo')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('sessions.createdAt')}:</span>
              <span className="font-medium">
                {format(new Date(session.createdAt), 'MMM d, yyyy', { locale })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('sessions.updatedAt')}:</span>
              <span className="font-medium">
                {format(new Date(session.updatedAt), 'MMM d, yyyy', { locale })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Session Bottom Sheet */}
      <BottomSheet
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('sessions.editSession')}
      >
        <div className="space-y-6">
          {/* Date/Time Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessions.sessionDate')}
            </label>
            <input
              type="datetime-local"
              value={editForm.date}
              onChange={(e) => {
                setEditForm(prev => ({ ...prev, date: e.target.value }));
                triggerAutoSave('date', e.target.value);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent text-base"
            />
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessions.notes')}
            </label>
            <textarea
              value={editForm.notes}
              onChange={(e) => {
                setEditForm(prev => ({ ...prev, notes: e.target.value }));
                triggerAutoSave('notes', e.target.value);
              }}
              placeholder={t('sessions.notesPlaceholder')}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent text-base resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveEdit}
            disabled={isSaving}
            className="w-full btn-primary flex items-center justify-center space-x-2 min-h-[48px]"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{t('common.save')}</span>
              </>
            )}
          </button>
        </div>
      </BottomSheet>

      {/* Actions Bottom Sheet */}
      <BottomSheet
        isOpen={isActionsModalOpen}
        onClose={() => setIsActionsModalOpen(false)}
        title={t('sessions.actions')}
      >
        <div className="space-y-3">
          {canEdit() && (
            <QuickActionButton
              icon={<Edit3 className="w-5 h-5" />}
              label={t('sessions.editSession')}
              onClick={() => {
                setIsActionsModalOpen(false);
                handleEditClick();
              }}
              variant="primary"
            />
          )}
          
          {profile?.role === 'coach' && (
            <>
              <QuickActionButton
                icon={<Phone className="w-5 h-5" />}
                label={t('sessions.callClient')}
                onClick={handleCallClient}
              />
              <QuickActionButton
                icon={<MessageSquare className="w-5 h-5" />}
                label={t('sessions.messageClient')}
                onClick={handleMessageClient}
              />
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};

export default MobileSessionDetail; 