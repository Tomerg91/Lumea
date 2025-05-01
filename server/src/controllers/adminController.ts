import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { EmailService } from '../services/emailService.js';

const emailService = new EmailService();

export const adminController = {
  // Get pending coaches
  getPendingCoaches: async (req: Request, res: Response) => {
    try {
      const pendingCoaches = await User.find({
        role: 'coach',
        status: 'pending',
      })
        .select('_id name email createdAt')
        .sort({ createdAt: -1 });

      res.json(pendingCoaches);
    } catch (error) {
      console.error('Error fetching pending coaches:', error);
      res.status(500).json({ message: 'Failed to fetch pending coaches' });
    }
  },

  // Get platform stats
  getStats: async (req: Request, res: Response) => {
    try {
      const [totalCoaches, totalClients, totalSessions] = await Promise.all([
        User.countDocuments({
          role: 'coach',
          status: 'active',
        }),
        User.countDocuments({
          role: 'client',
          status: 'active',
        }),
        Session.countDocuments(),
      ]);

      res.json({
        totalCoaches,
        totalClients,
        totalSessions,
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ message: 'Failed to fetch platform stats' });
    }
  },

  // Approve coach
  approveCoach: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const coach = await User.findOneAndUpdate(
        {
          _id: id,
          role: 'coach',
          status: 'pending',
        },
        {
          status: 'active',
        },
        { new: true }
      );

      if (!coach) {
        return res.status(404).json({ message: 'Coach not found' });
      }

      // Send approval email
      await emailService.sendEmail({
        to: coach.email,
        subject: 'Coach Application Approved',
        text: `Dear ${coach.name},\n\nYour coach application has been approved. You can now log in and start using the platform.\n\nBest regards,\nSatya Coaching Team`,
        html: `<p>Dear ${coach.name},</p><p>Your coach application has been approved. You can now log in and start using the platform.</p><p>Best regards,<br>Satya Coaching Team</p>`,
      });

      res.json({ message: 'Coach approved successfully' });
    } catch (error) {
      console.error('Error approving coach:', error);
      res.status(500).json({ message: 'Failed to approve coach' });
    }
  },

  // Reject coach
  rejectCoach: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const coach = await User.findOneAndUpdate(
        {
          _id: id,
          role: 'coach',
          status: 'pending',
        },
        {
          status: 'rejected',
        },
        { new: true }
      );

      if (!coach) {
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
      // Get all active users
      const users = await User.find({
        status: 'active',
      }).select('email name');

      // Send announcement email to all users
      await Promise.all(
        users.map((user) =>
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
