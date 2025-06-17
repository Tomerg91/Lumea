import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase.js';
import { EmailService } from '../services/emailService.js';
import type { User, UserStatus } from '../../../shared/types/database.js';

const emailService = new EmailService();

// Validation schemas
const batchApprovalSchema = z.object({
  coach_ids: z.array(z.string().uuid()),
  comment: z.string().optional(),
});

const coachActionSchema = z.object({
  comment: z.string().optional(),
  reason: z.string().optional(),
});

export const adminController = {
  // Get pending coaches for approval queue
  getPendingCoaches: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { status = 'pending_approval' } = req.query;

      // Get coaches with specified status
      const { data: coaches, error } = await serverTables.users()
        .select('id, email, name, bio, status, created_at, updated_at')
        .eq('role', 'coach')
        .eq('status', status as UserStatus)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting pending coaches:', error);
        res.status(500).json({ error: 'Failed to fetch pending coaches' });
        return;
      }

      res.json({
        coaches: coaches || [],
        count: coaches?.length || 0,
      });
    } catch (error) {
      console.error('Error getting pending coaches:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get comprehensive platform stats
  getStats: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      // Get basic counts
      const [
        allUsersResult,
        coachesResult,
        pendingCoachesResult,
        approvedCoachesResult,
        clientsResult,
        adminsResult,
        sessionsResult,
        completedSessionsResult,
        paymentsResult,
        paidPaymentsResult,
        reflectionsResult
      ] = await Promise.all([
        serverTables.users().select('*', { count: 'exact', head: true }),
        serverTables.users().select('*', { count: 'exact', head: true }).eq('role', 'coach'),
        serverTables.users().select('*', { count: 'exact', head: true }).eq('role', 'coach').eq('status', 'pending_approval'),
        serverTables.users().select('*', { count: 'exact', head: true }).eq('role', 'coach').eq('status', 'approved'),
        serverTables.users().select('*', { count: 'exact', head: true }).eq('role', 'client'),
        serverTables.users().select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        serverTables.sessions().select('*', { count: 'exact', head: true }),
        serverTables.sessions().select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
        serverTables.payments().select('*', { count: 'exact', head: true }),
        serverTables.payments().select('*', { count: 'exact', head: true }).eq('status', 'Paid'),
        serverTables.reflections().select('*', { count: 'exact', head: true })
      ]);

      if (allUsersResult.error || sessionsResult.error || paymentsResult.error) {
        console.error('Error fetching platform stats:', {
          users: allUsersResult.error,
          sessions: sessionsResult.error,
          payments: paymentsResult.error,
        });
        res.status(500).json({ error: 'Failed to fetch platform stats' });
        return;
      }

      // Get monthly data for trends (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const [monthlySessionsResult, monthlyUsersResult, monthlyPaymentsResult] = await Promise.all([
        serverTables.sessions()
          .select('created_at')
          .gte('created_at', twelveMonthsAgo.toISOString()),
        serverTables.users()
          .select('created_at')
          .gte('created_at', twelveMonthsAgo.toISOString()),
        serverTables.payments()
          .select('created_at, amount')
          .gte('created_at', twelveMonthsAgo.toISOString())
      ]);

      // Process monthly data
      const monthlyStats = {
        sessions: {} as Record<string, number>,
        users: {} as Record<string, number>,
        payments: {} as Record<string, number>,
        revenue: {} as Record<string, number>
      };

      // Initialize last 12 months
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
        monthlyStats.sessions[monthKey] = 0;
        monthlyStats.users[monthKey] = 0;
        monthlyStats.payments[monthKey] = 0;
        monthlyStats.revenue[monthKey] = 0;
      }

      // Count sessions by month
      if (monthlySessionsResult.data) {
        monthlySessionsResult.data.forEach(session => {
          const monthKey = session.created_at.substring(0, 7);
          if (monthlyStats.sessions[monthKey] !== undefined) {
            monthlyStats.sessions[monthKey]++;
          }
        });
      }

      // Count users by month
      if (monthlyUsersResult.data) {
        monthlyUsersResult.data.forEach(user => {
          const monthKey = user.created_at.substring(0, 7);
          if (monthlyStats.users[monthKey] !== undefined) {
            monthlyStats.users[monthKey]++;
          }
        });
      }

      // Count payments and revenue by month
      if (monthlyPaymentsResult.data) {
        monthlyPaymentsResult.data.forEach(payment => {
          const monthKey = payment.created_at.substring(0, 7);
          if (monthlyStats.payments[monthKey] !== undefined) {
            monthlyStats.payments[monthKey]++;
            monthlyStats.revenue[monthKey] += payment.amount || 0;
          }
        });
      }

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentUsersResult, recentSessionsResult, recentPaymentsResult] = await Promise.all([
        serverTables.users()
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        serverTables.sessions()
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        serverTables.payments()
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      // Calculate growth rates (compare current month vs previous month)
      const currentMonth = new Date().toISOString().substring(0, 7);
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const prevMonthKey = previousMonth.toISOString().substring(0, 7);

      const growthRates = {
        users: monthlyStats.users[prevMonthKey] > 0 
          ? ((monthlyStats.users[currentMonth] - monthlyStats.users[prevMonthKey]) / monthlyStats.users[prevMonthKey]) * 100 
          : 0,
        sessions: monthlyStats.sessions[prevMonthKey] > 0 
          ? ((monthlyStats.sessions[currentMonth] - monthlyStats.sessions[prevMonthKey]) / monthlyStats.sessions[prevMonthKey]) * 100 
          : 0,
        revenue: monthlyStats.revenue[prevMonthKey] > 0 
          ? ((monthlyStats.revenue[currentMonth] - monthlyStats.revenue[prevMonthKey]) / monthlyStats.revenue[prevMonthKey]) * 100 
          : 0
      };

      // System health indicators
      const systemHealth = {
        status: 'healthy' as 'healthy' | 'warning' | 'critical',
        metrics: {
          activeUsers: (recentUsersResult.count || 0),
          sessionCompletionRate: sessionsResult.count && sessionsResult.count > 0 
            ? ((completedSessionsResult.count || 0) / sessionsResult.count) * 100 
            : 0,
          paymentSuccessRate: paymentsResult.count && paymentsResult.count > 0 
            ? ((paidPaymentsResult.count || 0) / paymentsResult.count) * 100 
            : 0,
          coachApprovalQueue: pendingCoachesResult.count || 0
        }
      };

      // Determine system health status
      if (systemHealth.metrics.coachApprovalQueue > 10) {
        systemHealth.status = 'warning';
      }
      if (systemHealth.metrics.paymentSuccessRate < 80 || systemHealth.metrics.sessionCompletionRate < 70) {
        systemHealth.status = 'critical';
      }

      // Calculate total revenue
      const totalRevenueResult = await serverTables.payments()
        .select('amount')
        .eq('status', 'Paid');

      const totalRevenue = totalRevenueResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      // Return comprehensive stats in expected format
      res.json({
        users: {
          total: allUsersResult.count || 0,
          clients: clientsResult.count || 0,
          coaches: coachesResult.count || 0,
          pendingCoaches: pendingCoachesResult.count || 0,
          approvedCoaches: approvedCoachesResult.count || 0,
          admins: adminsResult.count || 0,
          monthly: monthlyStats.users
        },
        sessions: {
          total: sessionsResult.count || 0,
          completed: completedSessionsResult.count || 0,
          monthly: monthlyStats.sessions,
          completionRate: systemHealth.metrics.sessionCompletionRate
        },
        payments: {
          total: paymentsResult.count || 0,
          paid: paidPaymentsResult.count || 0,
          totalRevenue,
          monthly: monthlyStats.payments,
          monthlyRevenue: monthlyStats.revenue,
          successRate: systemHealth.metrics.paymentSuccessRate
        },
        reflections: {
          total: reflectionsResult.count || 0
        },
        recentActivity: {
          newUsers: recentUsersResult.count || 0,
          newSessions: recentSessionsResult.count || 0,
          newPayments: recentPaymentsResult.count || 0
        },
        growthRates,
        systemHealth
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ error: 'Failed to fetch platform stats' });
    }
  },

  // Batch approve multiple coaches
  batchApproveCoaches: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const validation = batchApprovalSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: 'Invalid request data', details: validation.error.errors });
        return;
      }

      const { coach_ids, comment } = validation.data;

      // Get all coaches to be approved
      const { data: coaches, error: fetchError } = await serverTables.users()
        .select('id, email, name, status')
        .in('id', coach_ids)
        .eq('role', 'coach');

      if (fetchError) {
        console.error('Error fetching coaches:', fetchError);
        res.status(500).json({ error: 'Failed to fetch coaches' });
        return;
      }

      if (!coaches || coaches.length === 0) {
        res.status(404).json({ error: 'No coaches found' });
        return;
      }

      // Filter out already approved coaches
      const pendingCoaches = coaches.filter(coach => coach.status !== 'approved');
      if (pendingCoaches.length === 0) {
        res.status(400).json({ error: 'All selected coaches are already approved' });
        return;
      }

      // Update all pending coaches to approved
      const { data: updatedCoaches, error: updateError } = await serverTables.users()
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString() 
        })
        .in('id', pendingCoaches.map(c => c.id))
        .select('id, email, name, status');

      if (updateError) {
        console.error('Error updating coaches:', updateError);
        res.status(500).json({ error: 'Failed to approve coaches' });
        return;
      }

      // Send approval emails to all coaches
      const emailPromises = pendingCoaches.map(coach =>
        emailService.sendEmail({
          to: coach.email,
          subject: 'Welcome to Satya Coaching - Application Approved!',
          text: `Dear ${coach.name},\n\nCongratulations! Your application to become a coach on Satya Coaching has been approved.\n\nYou can now start accepting clients and managing sessions.\n\n${comment ? `Admin comment: ${comment}\n\n` : ''}Best regards,\nSatya Coaching Team`,
          html: `<h2>Welcome to Satya Coaching!</h2><p>Dear ${coach.name},</p><p>Congratulations! Your application to become a coach on Satya Coaching has been <strong>approved</strong>.</p><p>You can now start accepting clients and managing sessions.</p>${comment ? `<p><em>Admin comment: ${comment}</em></p>` : ''}<p>Best regards,<br>Satya Coaching Team</p>`,
        })
      );

      await Promise.all(emailPromises);

      res.json({
        message: `${pendingCoaches.length} coaches approved successfully`,
        approvedCoaches: updatedCoaches,
        skippedCount: coaches.length - pendingCoaches.length,
      });
    } catch (error) {
      console.error('Error batch approving coaches:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Approve coach
  approveCoach: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      // Find and update the coach status
      const { data: coach, error: fetchError } = await serverTables.users()
        .select('id, email, name, status')
        .eq('id', id)
        .eq('role', 'coach')
        .single();

      if (fetchError || !coach) {
        res.status(404).json({ error: 'Coach not found' });
        return;
      }

      if (coach.status === 'approved') {
        res.status(400).json({ error: 'Coach is already approved' });
        return;
      }

      // Update coach status to approved
      const { data: updatedCoach, error: updateError } = await serverTables.users()
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select('id, email, name, status')
        .single();

      if (updateError) {
        console.error('Error updating coach status:', updateError);
        res.status(500).json({ error: 'Failed to approve coach' });
        return;
      }

      // Send approval email
      await emailService.sendEmail({
        to: coach.email,
        subject: 'Welcome to Satya Coaching - Application Approved!',
        text: `Dear ${coach.name},\n\nCongratulations! Your application to become a coach on Satya Coaching has been approved.\n\nYou can now start accepting clients and managing sessions.\n\n${comment ? `Admin comment: ${comment}\n\n` : ''}Best regards,\nSatya Coaching Team`,
        html: `<h2>Welcome to Satya Coaching!</h2><p>Dear ${coach.name},</p><p>Congratulations! Your application to become a coach on Satya Coaching has been <strong>approved</strong>.</p><p>You can now start accepting clients and managing sessions.</p>${comment ? `<p><em>Admin comment: ${comment}</em></p>` : ''}<p>Best regards,<br>Satya Coaching Team</p>`,
      });

      res.json({
        message: 'Coach approved successfully',
        coach: updatedCoach,
      });
    } catch (error) {
      console.error('Error approving coach:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Reject coach
  rejectCoach: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { comment, reason } = req.body;

      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      // Find and update the coach status
      const { data: coach, error: fetchError } = await serverTables.users()
        .select('id, email, name, status')
        .eq('id', id)
        .eq('role', 'coach')
        .single();

      if (fetchError || !coach) {
        res.status(404).json({ error: 'Coach not found' });
        return;
      }

      if (coach.status === 'rejected') {
        res.status(400).json({ error: 'Coach is already rejected' });
        return;
      }

      // Update coach status to rejected
      const { data: updatedCoach, error: updateError } = await serverTables.users()
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select('id, email, name, status')
        .single();

      if (updateError) {
        console.error('Error updating coach status:', updateError);
        res.status(500).json({ error: 'Failed to reject coach' });
        return;
      }

      // Send rejection email
      await emailService.sendEmail({
        to: coach.email,
        subject: 'Coach Application Status Update',
        text: `Dear ${coach.name},\n\nThank you for your interest in becoming a coach on Satya Coaching. After careful review, we regret to inform you that we cannot approve your application at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}${comment ? `Additional feedback: ${comment}\n\n` : ''}We appreciate your interest and encourage you to apply again in the future.\n\nBest regards,\nSatya Coaching Team`,
        html: `<h2>Coach Application Status Update</h2><p>Dear ${coach.name},</p><p>Thank you for your interest in becoming a coach on Satya Coaching. After careful review, we regret to inform you that we cannot approve your application at this time.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}${comment ? `<p><strong>Additional feedback:</strong> ${comment}</p>` : ''}<p>We appreciate your interest and encourage you to apply again in the future.</p><p>Best regards,<br>Satya Coaching Team</p>`,
      });

      res.json({
        message: 'Coach rejected successfully',
        coach: updatedCoach,
      });
    } catch (error) {
      console.error('Error rejecting coach:', error);
      res.status(500).json({ error: 'Failed to reject coach' });
    }
  },

  // Send announcement
  sendAnnouncement: async (req: Request, res: Response) => {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    try {
      // Get all users
      const { data: users, error } = await supabase
        .from('users')
        .select('email, name');

      if (error) {
        console.error('Error fetching users for announcement:', error);
        return res.status(500).json({ message: 'Failed to send announcement' });
      }

      // Send announcement email to all users
      await Promise.all(
        (users || []).map((user) =>
          emailService.sendEmail({
            to: user.email,
            subject: 'Platform Announcement',
            text: `Dear ${user.name},\n\n${message}\n\nBest regards,\nSatya Coaching Team`,
            html: `<p>Dear ${user.name},</p><p>${message}</p><p>Best regards,<br>Satya Coaching Team</p>`,
          })
        )
      );

      res.json({ message: 'Announcement sent successfully' });
    } catch (error) {
      console.error('Error sending announcement:', error);
      res.status(500).json({ message: 'Failed to send announcement' });
    }
  },
};
