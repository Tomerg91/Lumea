import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Notification types matching backend
export type NotificationType = 
  | 'session_cancelled' 
  | 'session_rescheduled' 
  | 'session_reminder' 
  | 'session_confirmation' 
  | 'cancellation_request' 
  | 'reschedule_request'
  | 'reflection_submitted';

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: string;
  sessionId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: Record<string, string>;
  status: NotificationStatus;
  scheduledAt: string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  senderId_details?: {
    firstName: string;
    lastName: string;
  };
  sessionId_details?: {
    date: string;
  };
}

export interface NotificationPreferences {
  _id?: string;
  userId: string;
  channels: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    push: boolean;
  };
  notificationTypes: {
    sessionReminders: boolean;
    sessionConfirmations: boolean;
    sessionCancellations: boolean;
    sessionRescheduling: boolean;
    cancellationRequests: boolean;
    rescheduleRequests: boolean;
  };
  reminderTiming: {
    hoursBefore: number;
    enableMultipleReminders: boolean;
    additionalReminderHours: number[];
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  emailPreferences: {
    digestEnabled: boolean;
    digestFrequency: 'daily' | 'weekly' | 'disabled';
    digestTime: string;
    htmlFormat: boolean;
  };
  language: string;
  timezone: string;
  advanced: {
    groupSimilarNotifications: boolean;
    maxNotificationsPerHour: number;
    enableReadReceipts: boolean;
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

class NotificationService {
  private socket: Socket | null = null;
  private subscribers: Map<string, (notifications: Notification[]) => void> = new Map();
  private unreadCountSubscribers: Set<(count: number) => void> = new Set();

  constructor() {
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection for real-time notifications
   */
  private initializeWebSocket() {
    if (typeof window === 'undefined') return; // Skip in SSR

    try {
      this.socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to notification socket');
      });

      this.socket.on('notification', (notification: Notification) => {
        console.log('Received real-time notification:', notification);
        // Notify all subscribers
        this.notifySubscribers();
        this.notifyUnreadCountSubscribers();
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from notification socket');
      });

      this.socket.on('error', (error: Error) => {
        console.error('Notification socket error:', error);
      });
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribe(id: string, callback: (notifications: Notification[]) => void) {
    this.subscribers.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Subscribe to unread count updates
   */
  subscribeToUnreadCount(callback: (count: number) => void) {
    this.unreadCountSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.unreadCountSubscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of notification updates
   */
  private async notifySubscribers() {
    try {
      const response = await this.getNotifications({ limit: 50 });
      const notifications = response.data;
      
      this.subscribers.forEach(callback => {
        callback(notifications);
      });
    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }

  /**
   * Notify all unread count subscribers
   */
  private async notifyUnreadCountSubscribers() {
    try {
      const response = await this.getUnreadCount();
      const count = response.count;
      
      this.unreadCountSubscribers.forEach(callback => {
        callback(count);
      });
    } catch (error) {
      console.error('Error notifying unread count subscribers:', error);
    }
  }

  /**
   * Get notifications for the authenticated user
   */
  async getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.status) searchParams.append('status', params.status);
    if (params.type) searchParams.append('type', params.type);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/notifications?${searchParams}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch notifications' }));
      throw new Error(errorData.message || 'Failed to fetch notifications');
    }

    return response.json();
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch unread count' }));
      throw new Error(errorData.message || 'Failed to fetch unread count');
    }

    return response.json();
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationResponse> {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to mark notification as read' }));
      throw new Error(errorData.message || 'Failed to mark notification as read');
    }

    const result = await response.json();
    
    // Notify subscribers of the update
    this.notifySubscribers();
    this.notifyUnreadCountSubscribers();
    
    return result;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<NotificationResponse> {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to mark all notifications as read' }));
      throw new Error(errorData.message || 'Failed to mark all notifications as read');
    }

    const result = await response.json();
    
    // Notify subscribers of the update
    this.notifySubscribers();
    this.notifyUnreadCountSubscribers();
    
    return result;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<{ success: boolean; data: NotificationPreferences }> {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch notification preferences' }));
      throw new Error(errorData.message || 'Failed to fetch notification preferences');
    }

    return response.json();
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<{ success: boolean; message: string; data: NotificationPreferences }> {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update notification preferences' }));
      throw new Error(errorData.message || 'Failed to update notification preferences');
    }

    return response.json();
  }

  /**
   * Send test notification (admin only)
   */
  async sendTestNotification(testData: {
    recipientId: string;
    type: NotificationType;
    channels: NotificationChannel[];
    variables?: Record<string, string>;
  }): Promise<NotificationResponse> {
    const response = await fetch(`${API_BASE_URL}/notifications/test`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to send test notification' }));
      throw new Error(errorData.message || 'Failed to send test notification');
    }

    return response.json();
  }

  /**
   * Get notification type display name
   */
  getTypeDisplayName(type: NotificationType): string {
    const typeMap: Record<NotificationType, string> = {
      'session_cancelled': 'Session Cancelled',
      'session_rescheduled': 'Session Rescheduled',
      'session_reminder': 'Session Reminder',
      'session_confirmation': 'Session Confirmation',
      'cancellation_request': 'Cancellation Request',
      'reschedule_request': 'Reschedule Request',
      'reflection_submitted': 'New Reflection',
    };
    return typeMap[type] || type;
  }

  /**
   * Get notification priority color
   */
  getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      'low': 'text-gray-600',
      'medium': 'text-blue-600',
      'high': 'text-orange-600',
      'urgent': 'text-red-600',
    };
    return colorMap[priority] || 'text-gray-600';
  }

  /**
   * Format notification date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscribers.clear();
    this.unreadCountSubscribers.clear();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService; 