import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Filter, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkAsRead, 
  useMarkAllAsRead 
} from '../hooks/useNotifications';
import { 
  supabaseNotificationService,
  type Notification, 
  type NotificationType, 
  type NotificationStatus 
} from '../services/supabaseNotificationService';
import { cn } from '../lib/utils';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  className 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<{
    status?: NotificationStatus;
    type?: NotificationType;
  }>({});
  const [page, setPage] = useState(0);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  // Use the new notification hooks
  const { 
    notifications, 
    total, 
    isLoading, 
    error 
  } = useNotifications({
    ...filter,
    limit,
    offset: page * limit
  });

  const { unreadCount } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // Accumulate notifications for pagination
  useEffect(() => {
    if (page === 0) {
      // Reset for new filter or first load
      setAllNotifications(notifications);
    } else {
      // Append for pagination
      setAllNotifications(prev => [...prev, ...notifications]);
    }
  }, [notifications, page]);

  // Reset pagination when filter changes
  useEffect(() => {
    setPage(0);
    setAllNotifications([]);
  }, [filter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMoreNotifications = () => {
    if (!isLoading && notifications.length === limit) {
      setPage(prev => prev + 1);
    }
  };

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'session_reminder':
        return '⏰';
      case 'session_confirmation':
        return '✅';
      case 'session_cancelled':
        return '❌';
      case 'session_rescheduled':
        return '📅';
      case 'cancellation_request':
        return '🔄';
      case 'reschedule_request':
        return '📝';
      case 'reflection_submitted':
        return '💭';
      case 'feedback_request':
        return '📝';
      default:
        return '📢';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
    const isUnread = notification.status === 'sent' || notification.status === 'delivered';
    
    return (
      <div
        className={cn(
          'flex items-start space-x-3 p-4 hover:bg-gradient-background-subtle transition-colors duration-200 border-b border-white/10 last:border-b-0',
          isUnread && 'bg-gradient-lavender/20',
          isRTL && 'flex-row-reverse space-x-reverse'
        )}
      >
        {/* Notification Icon */}
        <div className="flex-shrink-0 text-2xl">
          {getNotificationIcon(notification.type)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'flex items-center justify-between mb-1',
            isRTL && 'flex-row-reverse'
          )}>
            <h4 className={cn(
              'text-sm font-semibold truncate',
              isUnread ? 'text-gradient-purple' : 'text-gray-900'
            )}>
              {supabaseNotificationService.getTypeDisplayName(notification.type)}
            </h4>
            
            {/* Priority Badge */}
            <span
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-full border',
                getPriorityBadge(notification.priority)
              )}
            >
              {notification.priority}
            </span>
          </div>
          
          {/* Subject */}
          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
            {notification.subject}
          </p>
          
          {/* Metadata */}
          <div className={cn(
            'flex items-center justify-between text-xs text-gray-500',
            isRTL && 'flex-row-reverse'
          )}>
            <span>
              {supabaseNotificationService.formatDate(notification.created_at)}
            </span>
            
            {/* Mark as read button */}
            {isUnread && (
              <button
                onClick={(e) => handleMarkAsRead(notification.id, e)}
                className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-blue-100 text-blue-600 transition-colors duration-200',
                  isRTL && 'flex-row-reverse space-x-reverse'
                )}
                title={t('notifications.markAsRead')}
                disabled={markAsReadMutation.isPending}
              >
                <Check className="w-3 h-3" />
                <span className="hidden sm:inline">{t('notifications.markAsRead')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!session) return null;

  const hasMore = allNotifications.length < total && notifications.length === limit;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-xl glass-card hover-lift transition-all duration-300',
          isOpen && 'bg-gradient-lavender'
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute top-full mt-2 w-96 max-w-[90vw] bg-white/95 backdrop-blur-xl rounded-2xl shadow-lumea-strong border border-white/20 z-50',
          isRTL ? 'left-0' : 'right-0'
        )}>
          {/* Header */}
          <div className="p-4 border-b border-white/20">
            <div className={cn(
              'flex items-center justify-between',
              isRTL && 'flex-row-reverse'
            )}>
              <h3 className="text-lg font-semibold text-gradient-purple">
                {t('notifications.title')}
              </h3>
              
              <div className={cn(
                'flex items-center space-x-2',
                isRTL && 'flex-row-reverse space-x-reverse'
              )}>
                {/* Mark All Read Button */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 disabled:opacity-50"
                    title={t('notifications.markAllAsRead')}
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('notifications.markAllAsRead')}</span>
                  </button>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Filter Options */}
            <div className={cn(
              'flex items-center space-x-2 mt-3',
              isRTL && 'flex-row-reverse space-x-reverse'
            )}>
              <Filter className="w-4 h-4 text-gray-500" />
              
              <select
                value={filter.status || ''}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  status: e.target.value as NotificationStatus || undefined 
                }))}
                className="text-sm bg-white/50 border border-white/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('notifications.allStatuses')}</option>
                <option value="sent">{t('notifications.unread')}</option>
                <option value="read">{t('notifications.read')}</option>
              </select>
              
              <select
                value={filter.type || ''}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  type: e.target.value as NotificationType || undefined 
                }))}
                className="text-sm bg-white/50 border border-white/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('notifications.allTypes')}</option>
                <option value="session_reminder">{t('notifications.sessionReminder')}</option>
                <option value="session_confirmation">{t('notifications.sessionConfirmation')}</option>
                <option value="session_cancelled">{t('notifications.sessionCancelled')}</option>
                <option value="session_rescheduled">{t('notifications.sessionRescheduled')}</option>
                <option value="reflection_submitted">New Reflection</option>
                <option value="feedback_request">Feedback Request</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {error && (
              <div className="p-4 text-center text-red-600 bg-red-50/50">
                {error instanceof Error ? error.message : 'Failed to load notifications'}
              </div>
            )}
            
            {allNotifications.length === 0 && !isLoading && !error && (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('notifications.empty')}</p>
              </div>
            )}
            
            {allNotifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification}
              />
            ))}
            
            {/* Load More Button */}
            {hasMore && !isLoading && (
              <div className="p-4 text-center border-t border-white/10">
                <button
                  onClick={loadMoreNotifications}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {t('notifications.loadMore')}
                </button>
              </div>
            )}
            
            {isLoading && (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 