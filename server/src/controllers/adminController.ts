import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { Session } from '../models/Session.js';
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

      // Find all coaches with pending status
      const pendingCoaches = await User.find({
        status: 'pending'
      }).select('_id email firstName lastName createdAt');

      // Filter coaches based on role
      const filteredCoaches = pendingCoaches.filter(coach => {
        const roleValue = typeof coach.role === 'object' && coach.role !== null && 'name' in coach.role 
          ? coach.role.name 
          : String(coach.role);
        return roleValue === 'coach';
      });

      return res.status(200).json({ coaches: filteredCoaches });
    } catch (error) {
      console.error('Error getting pending coaches:', error);
      return res.status(500).json({ message: 'Internal server error' });
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
    try {
      const { id } = req.params;

      // Check if the requester is an admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Find the coach by ID
      const coach = await User.findById(id);

      if (!coach) {
        return res.status(404).json({ message: 'Coach not found' });
      }

      // Check if user has coach role - handling different role formats
      const roleValue = typeof coach.role === 'object' && coach.role !== null && 'name' in coach.role 
        ? coach.role.name 
        : String(coach.role);
      
      if (roleValue !== 'coach') {
        return res.status(400).json({ message: 'User is not a coach' });
      }

      // Update coach status to active
      coach.status = 'active';
      await coach.save();

      return res.status(200).json({ 
        message: 'Coach approved successfully',
        coach: {
          id: coach._id,
          email: coach.email,
          firstName: coach.firstName,
          lastName: coach.lastName,
          status: coach.status
        }
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
        text: `Dear ${coach.firstName} ${coach.lastName},\n\nThank you for your interest in becoming a coach. After careful review, we regret to inform you that we cannot approve your application at this time.\n\nBest regards,\nSatya Coaching Team`,
        html: `<p>Dear ${coach.firstName} ${coach.lastName},</p><p>Thank you for your interest in becoming a coach. After careful review, we regret to inform you that we cannot approve your application at this time.</p><p>Best regards,<br>Satya Coaching Team</p>`,
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
      }).select('email firstName lastName');

      // Send announcement email to all users
      await Promise.all(
        users.map((user) =>
          emailService.sendEmail({
            to: user.email,
            subject: 'Platform Announcement',
            text: `Dear ${user.firstName} ${user.lastName},\n\n${message}\n\nBest regards,\nSatya Coaching Team`,
            html: `<p>Dear ${user.firstName} ${user.lastName},</p><p>${message}</p><p>Best regards,<br>Satya Coaching Team</p>`,
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
