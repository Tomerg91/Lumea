import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeTable } from '../hooks/useRealtimeTable';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Notification types matching backend Supabase schema
export type NotificationType = 
  | 'session_cancelled' 
  | 'session_rescheduled' 
  | 'session_reminder' 
  | 'session_confirmation' 
  | 'cancellation_request' 
  | 'reschedule_request'
  | 'feedback_request'
  | 'reflection_submitted';

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

// Supabase-based notification interface (uses 'id' instead of '_id')
export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  session_id?: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  html_body: string;
  text_body: string;
  variables: Record<string, string>;
  status: NotificationStatus;
  scheduled_at: string;
  sent_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  // Populated fields from joins
  sender?: {
    first_name: string;
    last_name: string;
  };
  session?: {
    scheduled_date: string;
  };
}

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  channels: {
    email: boolean;
    in_app: boolean;
    sms: boolean;
    push: boolean;
  };
  notification_types: {
    session_reminders: boolean;
    session_confirmations: boolean;
    session_cancellations: boolean;
    session_rescheduling: boolean;
    cancellation_requests: boolean;
    reschedule_requests: boolean;
  };
  reminder_timing: {
    hours_before: number;
    enable_multiple_reminders: boolean;
    additional_reminder_hours: number[];
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  email_preferences: {
    digest_enabled: boolean;
    digest_frequency: 'daily' | 'weekly' | 'disabled';
    digest_time: string;
    html_format: boolean;
  };
  language: string;
  timezone: string;
  advanced: {
    group_similar_notifications: boolean;
    max_notifications_per_hour: number;
    enable_read_receipts: boolean;
  };
}

export interface GetNotificationsParams {
  status?: NotificationStatus;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface GetNotificationsResponse {
  success: boolean;
  data: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

class SupabaseNotificationService {
  /**
   * Get notifications for the current user
   */
  async getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.status) queryParams.set('status', params.status);
      if (params.type) queryParams.set('type', params.type);
      if (params.limit) queryParams.set('limit', params.limit.toString());
      if (params.offset) queryParams.set('offset', params.offset.toString());

      const response = await fetch(`${API_BASE_URL}/notifications?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(): Promise<{ success: boolean; data: NotificationPreferences }> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<{ success: boolean; message: string; data: NotificationPreferences }> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send a test notification (admin/coach only)
   */
  async sendTestNotification(testData: {
    recipient_id: string;
    type: NotificationType;
    channels: NotificationChannel[];
    variables?: Record<string, string>;
  }): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Get display name for notification type
   */
  getTypeDisplayName(type: NotificationType): string {
    const typeNames = {
      session_cancelled: 'Session Cancelled',
      session_rescheduled: 'Session Rescheduled',
      session_reminder: 'Session Reminder',
      session_confirmation: 'Session Confirmed',
      cancellation_request: 'Cancellation Request',
      reschedule_request: 'Reschedule Request',
      feedback_request: 'Feedback Request',
      reflection_submitted: 'New Reflection',
    };
    
    return typeNames[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get priority color class
   */
  getPriorityColor(priority: string): string {
    const colors = {
      urgent: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-blue-600 bg-blue-100',
      low: 'text-gray-600 bg-gray-100',
    };
    
    return colors[priority as keyof typeof colors] || colors.low;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown';
    }
  }
}

// Create and export singleton instance
export const supabaseNotificationService = new SupabaseNotificationService();
export default supabaseNotificationService; 