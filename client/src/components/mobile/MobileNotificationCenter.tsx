import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { cn } from '../../lib/utils';
import notificationService, {
  Notification,
  NotificationType,
  NotificationStatus
} from '../../services/notificationService';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  MoreHorizontal,
  Settings,
  Filter,
  Archive,
  Trash2,
  Calendar,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  ChevronDown,
  Circle,
  Loader2
} from 'lucide-react';

interface MobileNotificationCenterProps {
  className?: string;
  onNotificationClick?: (notification: Notification) => void;
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50, 25, 50]
    };
    navigator.vibrate(patterns[type]);
  }
};

// PWA Push Notification Support
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Service Worker Push Notification Registration
const registerPushNotifications = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
    });

    // Send subscription to server
    // await notificationService.subscribeToPush(subscription);
    console.log('Push notification subscription:', subscription);
    return true;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return false;
  }
};

// Mobile notification item with swipe actions
const MobileNotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onClick?: (notification: Notification) => void;
}> = ({ notification, onMarkAsRead, onDelete, onArchive, onClick }) => {
  const { t } = useTranslation();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const isUnread = notification.status === 'sent' || notification.status === 'delivered';

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    triggerHaptic('light');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startXRef.current;
    
    // Limit swipe distance
    const maxSwipe = 120;
    const offset = Math.max(-maxSwipe, Math.min(maxSwipe, diffX));
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    const threshold = 60;
    
    if (Math.abs(swipeOffset) > threshold) {
      if (swipeOffset > 0) {
        // Right swipe - mark as read
        onMarkAsRead(notification._id);
        triggerHaptic('medium');
      } else {
        // Left swipe - delete
        onDelete(notification._id);
        triggerHaptic('heavy');
      }
    }
    
    // Reset position
    setSwipeOffset(0);
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap = {
      session_reminder: <Clock className="w-5 h-5 text-orange-500" />,
      session_confirmation: <Check className="w-5 h-5 text-green-500" />,
      session_cancelled: <X className="w-5 h-5 text-red-500" />,
      session_rescheduled: <Calendar className="w-5 h-5 text-blue-500" />,
      cancellation_request: <AlertCircle className="w-5 h-5 text-yellow-500" />,
      reschedule_request: <Calendar className="w-5 h-5 text-purple-500" />,
    };
    return iconMap[type] || <Bell className="w-5 h-5 text-gray-500" />;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-blue-500',
      low: 'bg-gray-500',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Action Background */}
      <div className="absolute inset-0 flex">
        {/* Right swipe action (mark as read) */}
        <div className="flex-1 bg-green-500 flex items-center justify-start px-6">
          <Check className="w-6 h-6 text-white" />
        </div>
        {/* Left swipe action (delete) */}
        <div className="flex-1 bg-red-500 flex items-center justify-end px-6">
          <Trash2 className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Notification Item */}
      <div
        ref={itemRef}
        className={cn(
          'relative bg-white p-4 border-b border-gray-100 transition-transform duration-200',
          'touch-manipulation select-none',
          isUnread && 'bg-blue-50 border-l-4 border-l-blue-500',
          isDragging && 'transition-none'
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onClick?.(notification)}
      >
        <div className="flex items-start space-x-3">
          {/* Notification Icon */}
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={cn(
                'text-sm font-semibold truncate',
                isUnread ? 'text-gray-900' : 'text-gray-600'
              )}>
                {notificationService.getTypeDisplayName(notification.type)}
              </h4>
              
              {/* Priority Indicator */}
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  getPriorityColor(notification.priority)
                )} />
                <span className="text-xs text-gray-500">
                  {notificationService.formatDate(notification.createdAt)}
                </span>
              </div>
            </div>
            
            {/* Subject */}
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
              {notification.subject}
            </p>
            
            {/* Meta Info */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 capitalize">
                {notification.priority} {t('notifications.priority')}
              </span>
              
              {isUnread && (
                <div className="flex items-center space-x-1">
                  <Circle className="w-2 h-2 text-blue-500 fill-current" />
                  <span className="text-xs text-blue-600 font-medium">
                    {t('notifications.unread')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile bottom sheet notification center
const MobileNotificationCenter: React.FC<MobileNotificationCenterProps> = ({
  className,
  onNotificationClick
}) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isMobile } = useMobileDetection();
  
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status?: NotificationStatus;
    type?: NotificationType;
  }>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const limit = 20;

  // Load notifications and set up real-time updates
  useEffect(() => {
    if (!session) return;

    loadNotifications(true);
    loadUnreadCount();
    checkPushNotificationStatus();

    // Subscribe to real-time updates
    const unsubscribeNotifications = notificationService.subscribe(
      'mobile-notification-center',
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      }
    );

    const unsubscribeUnreadCount = notificationService.subscribeToUnreadCount(
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeUnreadCount();
    };
  }, [session, filter]);

  // Check PWA push notification status
  const checkPushNotificationStatus = useCallback(async () => {
    const hasPermission = Notification.permission === 'granted';
    setPushNotificationsEnabled(hasPermission);
  }, []);

  // Load notifications with pagination
  const loadNotifications = async (reset = false) => {
    if (loading || (!reset && !hasMore)) return;

    setLoading(true);
    setError(null);

    try {
      const currentPage = reset ? 0 : page;
      const response = await notificationService.getNotifications({
        ...filter,
        limit,
        offset: currentPage * limit,
      });

      if (reset) {
        setNotifications(response.data);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...response.data]);
        setPage(prev => prev + 1);
      }

      setHasMore(response.data.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  // Handle PWA push notification toggle
  const handlePushNotificationToggle = async () => {
    if (!pushNotificationsEnabled) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        const registered = await registerPushNotifications();
        setPushNotificationsEnabled(registered);
        triggerHaptic('medium');
      }
    } else {
      // Would unsubscribe from push notifications
      setPushNotificationsEnabled(false);
      triggerHaptic('light');
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString() }
            : n
        )
      );
      triggerHaptic('light');
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      triggerHaptic('medium');
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Archive notification
  const handleArchiveNotification = async (notificationId: string) => {
    try {
      // await notificationService.archiveNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      triggerHaptic('light');
    } catch (err) {
      console.error('Failed to archive notification:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          status: 'read' as NotificationStatus, 
          readAt: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
      triggerHaptic('medium');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Bulk actions for selected notifications
  const handleBulkAction = async (action: 'read' | 'delete' | 'archive') => {
    const selectedIds = Array.from(selectedNotifications);
    
    try {
      switch (action) {
        case 'read':
          await Promise.all(selectedIds.map(id => notificationService.markAsRead(id)));
          setNotifications(prev => 
            prev.map(n => 
              selectedIds.includes(n._id) 
                ? { ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString() }
                : n
            )
          );
          break;
        case 'delete':
          // await Promise.all(selectedIds.map(id => notificationService.deleteNotification(id)));
          setNotifications(prev => prev.filter(n => !selectedIds.includes(n._id)));
          break;
        case 'archive':
          // await Promise.all(selectedIds.map(id => notificationService.archiveNotification(id)));
          setNotifications(prev => prev.filter(n => !selectedIds.includes(n._id)));
          break;
      }
      
      setSelectedNotifications(new Set());
      setIsSelectionMode(false);
      triggerHaptic('medium');
    } catch (err) {
      console.error(`Failed to ${action} notifications:`, err);
    }
  };

  // Handle bottom sheet gesture
  const handleSheetTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startYRef.current;
    
    // Close if dragged down significantly
    if (diffY > 150) {
      setIsOpen(false);
      triggerHaptic('light');
    }
  };

  // Don't render on desktop
  if (!isMobile || !session) {
    return null;
  }

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          triggerHaptic('medium');
        }}
        className={cn(
          'relative p-3 rounded-full glass-card transition-all duration-300',
          'active:scale-95',
          className
        )}
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Bottom Sheet Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setIsOpen(false)}
        >
          {/* Bottom Sheet */}
          <div
            ref={bottomSheetRef}
            className="w-full max-h-[85vh] bg-white rounded-t-3xl flex flex-col"
            onClick={e => e.stopPropagation()}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
          >
            {/* Handle Bar */}
            <div className="flex-shrink-0 flex justify-center py-3">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 px-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('notifications.title')}
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                
                <div className="flex items-center space-x-2">
                  {/* Selection Mode Toggle */}
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedNotifications(new Set());
                      triggerHaptic('light');
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {!isSelectionMode ? (
                  <>
                    {/* Mark All Read */}
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>{t('notifications.markAllAsRead')}</span>
                      </button>
                    )}
                    
                    {/* PWA Push Notifications */}
                    <button
                      onClick={handlePushNotificationToggle}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium',
                        pushNotificationsEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      <Bell className="w-4 h-4" />
                      <span>
                        {pushNotificationsEnabled 
                          ? t('notifications.pushEnabled') 
                          : t('notifications.enablePush')
                        }
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Bulk Actions */}
                    <button
                      onClick={() => handleBulkAction('read')}
                      disabled={selectedNotifications.size === 0}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t('notifications.markAsRead')}</span>
                    </button>
                    
                    <button
                      onClick={() => handleBulkAction('archive')}
                      disabled={selectedNotifications.size === 0}
                      className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium disabled:opacity-50"
                    >
                      <Archive className="w-4 h-4" />
                      <span>{t('notifications.archive')}</span>
                    </button>
                    
                    <button
                      onClick={() => handleBulkAction('delete')}
                      disabled={selectedNotifications.size === 0}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('notifications.delete')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="p-4 text-center text-red-600 bg-red-50">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>{error}</p>
                </div>
              )}
              
              {notifications.length === 0 && !loading && !error && (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">{t('notifications.empty')}</p>
                  <p className="text-sm">{t('notifications.emptyDescription')}</p>
                </div>
              )}
              
              {/* Notification List */}
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div key={notification._id} className="relative">
                    {isSelectionMode && (
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.has(notification._id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedNotifications);
                            if (e.target.checked) {
                              newSelected.add(notification._id);
                            } else {
                              newSelected.delete(notification._id);
                            }
                            setSelectedNotifications(newSelected);
                            triggerHaptic('light');
                          }}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                      </div>
                    )}
                    
                    <div className={cn(isSelectionMode && 'pl-12')}>
                      <MobileNotificationItem
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDeleteNotification}
                        onArchive={handleArchiveNotification}
                        onClick={onNotificationClick}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Load More */}
              {hasMore && !loading && notifications.length > 0 && (
                <div className="p-4 text-center">
                  <button
                    onClick={() => loadNotifications(false)}
                    className="px-6 py-3 bg-blue-50 text-blue-600 rounded-full font-medium"
                  >
                    {t('notifications.loadMore')}
                  </button>
                </div>
              )}
              
              {loading && (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                </div>
              )}
            </div>

            {/* Safe Area Bottom */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNotificationCenter;
 