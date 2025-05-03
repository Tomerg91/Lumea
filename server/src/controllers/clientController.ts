import { Request, Response } from 'express';
import { User } from '../models/User';
import { CoachingSession } from '../models/CoachingSession';
import { z } from 'zod';

// Validation schema for query parameters
const getClientsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  page: z.coerce.number().optional().default(1),
  search: z.string().optional(),
});

export const clientController = {
  // Get clients for the authenticated coach
  getMyClients: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Validate and extract query parameters
      try {
        const validatedQuery = getClientsQuerySchema.parse(req.query);
        const { limit, page, search } = validatedQuery;

        // Build query to find clients where the coach ID matches the authenticated user
        const query: Record<string, unknown> = {
          coachId: req.user.id,
          role: 'client',
        };

        // Add search functionality if provided
        if (search) {
          const searchRegex = new RegExp(search, 'i');
          query.$or = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
          ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Query clients
        const clients = await User.find(query)
          .select('_id firstName lastName email createdAt')
          .sort({ lastName: 1, firstName: 1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Get total count for pagination
        const total = await User.countDocuments(query);

        // Fetch the last session date for each client
        const clientsWithLastSession = await Promise.all(
          clients.map(async (client) => {
            const lastSession = await CoachingSession.findOne({
              coachId: req.user.id,
              clientId: client._id,
            })
              .sort({ date: -1 })
              .select('date')
              .lean();

            return {
              ...client,
              lastSessionDate: lastSession ? lastSession.date : null,
            };
          })
        );

        // Return clients with pagination info
        res.json({
          clients: clientsWithLastSession,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error getting clients:', error);
      res.status(500).json({ message: 'Failed to get clients' });
    }
  },
}; 