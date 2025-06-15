import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

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

    // Check pending invites count from database (assuming we have an invite_tokens table)
    const { count: pendingInvitesCount, error: countError } = await supabase
      .from('invite_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId);

    if (countError) {
      console.error('Error counting pending invites:', countError);
      res.status(500).json({ message: 'Error checking pending invites' });
      return;
    }

    const totalInvites = (pendingInvitesCount || 0) + rateLimit.count;

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

    // Get clients through sessions (since coach-client relationship is established through sessions)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('client_id')
      .eq('coach_id', coachId);

    if (sessionsError) {
      console.error('Error fetching coach sessions:', sessionsError);
      res.status(500).json({ message: 'Error retrieving clients' });
      return;
    }

    // Get unique client IDs
    const clientIds = [...new Set(sessions?.map(s => s.client_id) || [])];

    if (clientIds.length === 0) {
      res.status(200).json({
        clients: [],
        pendingInvites: [],
        pagination: {
          total: 0,
          currentPage: page,
          totalPages: 0,
          limit,
        },
      });
      return;
    }

    // Get clients with pagination
    const { data: clients, error: clientsError } = await supabase
      .from('users')
      .select('id, name, email, status, created_at')
      .in('id', clientIds)
      .eq('role', 'client')
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false });

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      res.status(500).json({ message: 'Error retrieving clients' });
      return;
    }

    // Get total count
    const { count: totalClients, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('id', clientIds)
      .eq('role', 'client');

    if (countError) {
      console.error('Error counting clients:', countError);
    }

    // Get pending invites (assuming we have an invite_tokens table)
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invite_tokens')
      .select('email, created_at, expires')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Error fetching pending invites:', invitesError);
    }

    res.status(200).json({
      clients: clients || [],
      pendingInvites: pendingInvites || [],
      pagination: {
        total: totalClients || 0,
        currentPage: page,
        totalPages: Math.ceil((totalClients || 0) / limit),
        limit,
      },
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ message: 'Error retrieving clients' });
  }
};
