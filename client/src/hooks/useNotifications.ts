import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRealtimeTable } from './useRealtime';
import { supabaseNotificationService, type Notification, type GetNotificationsParams } from '../services/supabaseNotificationService';
import { useAuth } from '../contexts/AuthContext';

export const NOTIFICATIONS_QUERY_KEY = 'notifications';
export const UNREAD_COUNT_QUERY_KEY = 'unread-count';

/**
 * Hook for fetching notifications with real-time updates
 */
export function useNotifications(params: GetNotificationsParams = {}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Query for notifications
  const notificationsQuery = useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, params],
    queryFn: () => supabaseNotificationService.getNotifications(params),
    enabled: !!session,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Real-time subscription for notifications table
  useRealtimeTable(
    'notifications',
    session ? `recipient_id=eq.${session.user.id}` : null,
    (payload) => {
      console.log('Notification real-time event:', payload);
      // Invalidate notifications queries to refetch
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_QUERY_KEY] });
    }
  );

  return {
    notifications: notificationsQuery.data?.data || [],
    total: notificationsQuery.data?.total || 0,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    refetch: notificationsQuery.refetch,
  };
}

/**
 * Hook for fetching unread notification count with real-time updates
 */
export function useUnreadCount() {
  const { session } = useAuth();
  
  const unreadCountQuery = useQuery({
    queryKey: [UNREAD_COUNT_QUERY_KEY],
    queryFn: () => supabaseNotificationService.getUnreadCount(),
    enabled: !!session,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    unreadCount: unreadCountQuery.data?.count || 0,
    isLoading: unreadCountQuery.isLoading,
    error: unreadCountQuery.error,
    refetch: unreadCountQuery.refetch,
  };
}

/**
 * Hook for marking notifications as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      supabaseNotificationService.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate and refetch notifications and unread count
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_QUERY_KEY] });
    },
  });
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => supabaseNotificationService.markAllAsRead(),
    onSuccess: () => {
      // Invalidate and refetch notifications and unread count
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_QUERY_KEY] });
    },
  });
}

/**
 * Hook for notification preferences
 */
export function useNotificationPreferences() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => supabaseNotificationService.getPreferences(),
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: any) => 
      supabaseNotificationService.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  return {
    preferences: preferencesQuery.data?.data,
    isLoading: preferencesQuery.isLoading,
    error: preferencesQuery.error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}

/**
 * Hook for sending test notifications (admin/coach only)
 */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: (testData: {
      recipient_id: string;
      type: any;
      channels: any[];
      variables?: Record<string, string>;
    }) => supabaseNotificationService.sendTestNotification(testData),
  });
} 