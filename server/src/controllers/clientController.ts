import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export const clientController = {
  async getDashboardStats(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'client') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const clientId = req.user.id;

      // Get total sessions
      const { count: totalSessions, error: totalError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (totalError) {
        console.error('Error fetching total sessions:', totalError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      // Get upcoming sessions (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const { count: upcomingSessions, error: upcomingError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('date', new Date().toISOString())
        .lte('date', sevenDaysFromNow.toISOString())
        .neq('status', 'cancelled');

      if (upcomingError) {
        console.error('Error fetching upcoming sessions:', upcomingError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      // Get recent sessions (last 5)
      const { data: recentSessions, error: recentError } = await supabase
        .from('sessions')
        .select(`
          id,
          date,
          status,
          notes,
          coach:coach_id!inner(id, name, email)
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent sessions:', recentError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      const recentSessionsFormatted = recentSessions?.map(session => {
        const coach = Array.isArray(session.coach) ? session.coach[0] : session.coach;
        return {
          id: session.id,
          date: session.date,
          status: session.status,
          coach: {
            id: coach.id,
            name: coach.name,
            email: coach.email,
          },
          notes: session.notes || '',
        };
      }) || [];

      res.json({
        totalSessions: totalSessions || 0,
        upcomingSessions: upcomingSessions || 0,
        recentSessions: recentSessionsFormatted,
      });
    } catch (error) {
      console.error('Error fetching client dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  },

  async getSchedule(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'client') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const clientId = req.user.id;
      const { startDate, endDate } = req.query;

      let query = supabase
        .from('sessions')
        .select(`
          id,
          date,
          status,
          notes,
          coach:coach_id!inner(id, name, email)
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: true });

      if (startDate && endDate) {
        query = query
          .gte('date', startDate as string)
          .lte('date', endDate as string);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching client schedule:', error);
        return res.status(500).json({ error: 'Failed to fetch schedule' });
      }

      const formattedSessions = sessions?.map(session => {
        const coach = Array.isArray(session.coach) ? session.coach[0] : session.coach;
        return {
          id: session.id,
          date: session.date,
          status: session.status,
          coach: {
            id: coach.id,
            name: coach.name,
            email: coach.email,
          },
          notes: session.notes || '',
        };
      }) || [];

      res.json(formattedSessions);
    } catch (error) {
      console.error('Error fetching client schedule:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  },

  async getCoachDetails(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'client') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const clientId = req.user.id;

      // Find the client's coach through sessions
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          coach:coach_id!inner(id, name, email, bio)
        `)
        .eq('client_id', clientId)
        .limit(1)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: 'No coach found' });
      }

      const coach = Array.isArray(session.coach) ? session.coach[0] : session.coach;

      // Get all sessions with this coach
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, date, status, notes')
        .eq('client_id', clientId)
        .eq('coach_id', coach.id)
        .order('date', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions with coach:', sessionsError);
        return res.status(500).json({ error: 'Failed to fetch coach details' });
      }

      const formattedSessions = sessions?.map(session => ({
        id: session.id,
        date: session.date,
        status: session.status,
        notes: session.notes || '',
      })) || [];

      res.json({
        coach: {
          id: coach.id,
          name: coach.name,
          email: coach.email,
          bio: coach.bio || '',
        },
        sessions: formattedSessions,
        totalSessions: sessions?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching coach details:', error);
      res.status(500).json({ error: 'Failed to fetch coach details' });
    }
  },

  async updateSessionFeedback(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'client') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const clientId = req.user.id;
      const { sessionId } = req.params;
      const { feedback, rating } = req.body;

      // Verify that this session belongs to this client
      const { data: session, error: verifyError } = await supabase
        .from('sessions')
        .select('id, client_id')
        .eq('id', sessionId)
        .eq('client_id', clientId)
        .single();

      if (verifyError || !session) {
        return res.status(404).json({ error: 'Session not found or access denied' });
      }

      // Note: client_feedback and client_rating columns don't exist in current schema
      // This endpoint would need schema updates to store feedback
      res.status(501).json({ 
        error: 'Feedback functionality not implemented - requires schema updates'
      });
    } catch (error) {
      console.error('Error updating session feedback:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  },

  async getMyClients(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const coachId = req.user.id;

      // Get all clients for this coach through sessions
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          client:client_id!inner(id, name, email, created_at),
          date,
          status
        `)
        .eq('coach_id', coachId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching coach clients:', error);
        return res.status(500).json({ error: 'Failed to fetch clients' });
      }

      // Group by client and get latest session info
      const clientsMap = new Map();
      
      sessions?.forEach(session => {
        const client = Array.isArray(session.client) ? session.client[0] : session.client;
        if (!clientsMap.has(client.id)) {
          clientsMap.set(client.id, {
            id: client.id,
            name: client.name,
            email: client.email,
            joinedAt: client.created_at,
            lastSessionDate: session.date,
            lastSessionStatus: session.status,
            totalSessions: 1,
          });
        } else {
          const existingClient = clientsMap.get(client.id);
          existingClient.totalSessions++;
          // Keep the most recent session date
          if (new Date(session.date) > new Date(existingClient.lastSessionDate)) {
            existingClient.lastSessionDate = session.date;
            existingClient.lastSessionStatus = session.status;
          }
        }
      });

      const clients = Array.from(clientsMap.values());

      res.json({
        clients,
        totalClients: clients.length,
      });
    } catch (error) {
      console.error('Error fetching coach clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  },
};
