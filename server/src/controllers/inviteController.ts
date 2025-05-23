import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { InviteToken } from '../models/InviteToken';
import { createInviteToken } from '../utils/tokenHelpers';
import { sendInvite } from '../mail/sendInvite';

// Rate limit cache
interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();
const MAX_INVITES = 20; // Maximum 20 pending invites per coach
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Invite a client by email (coach only)
 */
export const inviteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Unauthorized: User not logged in or user ID missing.' });
      return;
    }
    const coachId = req.user.id.toString();

    // Ensure the user is a coach
    if (!req.user || !req.user.role || req.user.role !== 'coach') {
      res.status(403).json({ message: 'Only coaches can invite clients' });
      return;
    }

    const { email } = req.body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      res.status(400).json({ message: 'Valid email address is required' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'A user with this email already exists' });
      return;
    }

    // Apply rate limiting
    const now = Date.now();

    // Clean up expired entries
    for (const [key, entry] of rateLimitCache.entries()) {
      if (now - entry.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitCache.delete(key);
      }
    }

    // Check current rate limit
    const rateLimit = rateLimitCache.get(coachId) || { count: 0, timestamp: now };

    // Check pending invites count
    const pendingInvitesCount = await InviteToken.countDocuments({
      coachId: new mongoose.Types.ObjectId(coachId),
    });

    const totalInvites = pendingInvitesCount + rateLimit.count;

    if (totalInvites >= MAX_INVITES) {
      res.status(429).json({
        message: `You have reached the maximum limit of ${MAX_INVITES} pending invites`,
      });
      return;
    }

    // Update rate limit
    rateLimitCache.set(coachId, {
      count: rateLimit.count + 1,
      timestamp: rateLimit.timestamp,
    });

    // Generate and save the invite token
    const token = await createInviteToken(coachId, email);

    // Get coach name for the email
    const coachName = req.user.name || 'Coach';

    // Send the invitation email
    await sendInvite(email, token, coachName);

    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error inviting client:', error);
    res.status(500).json({ message: 'Error sending invitation' });
  }
};

/**
 * Get a list of clients for a coach
 */
export const getMyClients = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Unauthorized: User not logged in or user ID missing.' });
      return;
    }
    const coachId = req.user.id;

    // Ensure the user is a coach
    if (!req.user || !req.user.role || req.user.role !== 'coach') {
      res.status(403).json({ message: 'Only coaches can view their clients' });
      return;
    }

    // Pagination parameters
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const skip = (page - 1) * limit;

    // Get client role id
    const clientRole = await Role.findOne({ name: 'client' });

    if (!clientRole) {
      res.status(500).json({ message: 'Client role not found' });
      return;
    }

    // Get clients
    const clients = await User.find({
      coachId,
      role: clientRole._id,
    })
      .select('_id firstName lastName email isApproved createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalClients = await User.countDocuments({
      coachId,
      role: clientRole._id,
    });

    // Get pending invites
    const pendingInvites = await InviteToken.find({ coachId })
      .select('email createdAt expires')
      .sort({ createdAt: -1 });

    res.status(200).json({
      clients,
      pendingInvites,
      pagination: {
        total: totalClients,
        currentPage: page,
        totalPages: Math.ceil(totalClients / limit),
        limit,
      },
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ message: 'Error retrieving clients' });
  }
};
