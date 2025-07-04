import { Request, Response } from 'express';
import { serverTables } from '../lib/supabase';
import { supabaseNotificationService } from '../services/supabaseNotificationService';

export class NotificationController {
  /**
   * Get notifications for the authenticated user
   */
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { 
        status, 
        type, 
        limit = 20, 
        offset = 0 
      } = req.query;

      let query = serverTables.notifications()
        .select(`
          id,
          recipient_id,
          sender_id,
          session_id,
          type,
          channel,
          status,
          subject,
          html_body,
          text_body,
          variables,
          priority,
          scheduled_at,
          sent_at,
          delivered_at,
          read_at,
          failed_at,
          failure_reason,
          retry_count,
          max_retries,
          created_at,
          updated_at
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('type', type);
      }

      // Apply pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      query = query.range(offsetNum, offsetNum + limitNum - 1);

      const { data: notifications, error, count } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch notifications',
        });
      }

      // Get total count for pagination
      let totalCount = count || 0;
      if (count === null) {
        const { count: totalCountResult, error: countError } = await serverTables.notifications()
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', userId);
        
        if (!countError) {
          totalCount = totalCountResult || 0;
        }
      }

      res.status(200).json({
        success: true,
        data: notifications || [],
        total: totalCount,
        limit: limitNum,
        offset: offsetNum,
      });
    } catch (error) {
      console.error('Error getting user notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
      });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const { count, error } = await serverTables.notifications()
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .in('status', ['pending', 'sent', 'delivered']); // Unread statuses

      if (error) {
        console.error('Error getting unread count:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to get unread notification count',
        });
      }

      res.status(200).json({
        success: true,
        count: count || 0,
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread notification count',
      });
    }
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      // Verify the notification belongs to the user
      const { data: notification, error: fetchError } = await serverTables.notifications()
        .select('id, recipient_id')
        .eq('id', notificationId)
        .eq('recipient_id', userId)
        .single();

      if (fetchError || !notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      // Update notification status
      const { error: updateError } = await serverTables.notifications()
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (updateError) {
        console.error('Error marking notification as read:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to mark notification as read',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const { error } = await serverTables.notifications()
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('recipient_id', userId)
        .in('status', ['pending', 'sent', 'delivered']); // Only mark unread notifications

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to mark all notifications as read',
        });
      }

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
      });
    }
  }

  /**
   * Create a test notification (admin only)
   */
  static async createTestNotification(req: Request, res: Response) {
    try {
      // Check admin access
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for test notifications',
        });
      }

      const { recipientId, type, channels, variables = {} } = req.body;

      // Create test notification
      const notificationId = await supabaseNotificationService.createNotification({
        recipient_id: recipientId,
        sender_id: req.user!.id,
        type,
        channel: channels[0] || 'in_app', // Use first channel
        subject: `Test Notification: ${type}`,
        html_body: `<p>This is a test notification of type: ${type}</p>`,
        text_body: `This is a test notification of type: ${type}`,
        variables: {
          ...variables,
          recipientName: 'Test User',
          sessionDate: new Date().toLocaleString(),
          duration: '60',
          coachName: 'Test Coach',
        },
        priority: 'low',
      });

      if (!notificationId) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create test notification',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Test notification created successfully',
        data: { notificationId },
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test notification',
      });
    }
  }
} 