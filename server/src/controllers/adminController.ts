import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { EmailService } from '../services/emailService.js';

const emailService = new EmailService();

export const adminController = {
  // Get pending coaches
  getPendingCoaches: async (req: Request, res: Response) => {
    try {
      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Find all coaches (no status column in current schema)
      const { data: pendingCoaches, error } = await supabase
        .from('users')
        .select('id, email, name, created_at')
        .eq('role', 'coach');

      if (error) {
        console.error('Error getting pending coaches:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      return res.status(200).json({ coaches: pendingCoaches || [] });
    } catch (error) {
      console.error('Error getting pending coaches:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get platform stats
  getStats: async (req: Request, res: Response) => {
    try {
      const [coachesResult, clientsResult, sessionsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'coach'),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client'),
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
      ]);

      if (coachesResult.error || clientsResult.error || sessionsResult.error) {
        console.error('Error fetching platform stats:', {
          coaches: coachesResult.error,
          clients: clientsResult.error,
          sessions: sessionsResult.error,
        });
        return res.status(500).json({ message: 'Failed to fetch platform stats' });
      }

      res.json({
        totalCoaches: coachesResult.count || 0,
        totalClients: clientsResult.count || 0,
        totalSessions: sessionsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ message: 'Failed to fetch platform stats' });
    }
  },

  // Approve coach
  approveCoach: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Find the coach (no status updates in current schema)
      const { data: coach, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', id)
        .eq('role', 'coach')
        .single();

      if (error || !coach) {
        return res.status(404).json({ message: 'Coach not found' });
      }

      return res.status(200).json({
        message: 'Coach approved successfully',
        coach: {
          id: coach.id,
          email: coach.email,
          name: coach.name,
        },
      });
    } catch (error) {
      console.error('Error approving coach:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Reject coach
  rejectCoach: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const { data: coach, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', id)
        .eq('role', 'coach')
        .single();

      if (error || !coach) {
        return res.status(404).json({ message: 'Coach not found' });
      }

      // Send rejection email
      await emailService.sendEmail({
        to: coach.email,
        subject: 'Coach Application Status',
        text: `Dear ${coach.name},\n\nThank you for your interest in becoming a coach. After careful review, we regret to inform you that we cannot approve your application at this time.\n\nBest regards,\nSatya Coaching Team`,
        html: `<p>Dear ${coach.name},</p><p>Thank you for your interest in becoming a coach. After careful review, we regret to inform you that we cannot approve your application at this time.</p><p>Best regards,<br>Satya Coaching Team</p>`,
      });

      res.json({ message: 'Coach rejected successfully' });
    } catch (error) {
      console.error('Error rejecting coach:', error);
      res.status(500).json({ message: 'Failed to reject coach' });
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
