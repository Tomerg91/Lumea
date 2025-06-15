import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

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
        .gte('scheduled_date', new Date().toISOString())
        .lte('scheduled_date', sevenDaysFromNow.toISOString())
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
          scheduled_date,
          duration,
          status,
          notes,
          coach:coach_id!inner(id, name, email)
        `)
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent sessions:', recentError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      const recentSessionsFormatted = recentSessions?.map(session => {
        const coach = Array.isArray(session.coach) ? session.coach[0] : session.coach;
        return {
          id: session.id,
          date: session.scheduled_date,
          duration: session.duration,
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
          scheduled_date,
          duration,
          status,
          notes,
          video_url,
          coach:coach_id!inner(id, name, email)
        `)
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: true });

      if (startDate && endDate) {
        query = query
          .gte('scheduled_date', startDate as string)
          .lte('scheduled_date', endDate as string);
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
          date: session.scheduled_date,
          duration: session.duration,
          status: session.status,
          coach: {
            id: coach.id,
            name: coach.name,
            email: coach.email,
          },
          notes: session.notes || '',
          videoUrl: session.video_url || '',
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
        .select('id, scheduled_date, duration, status, notes, video_url')
        .eq('client_id', clientId)
        .eq('coach_id', coach.id)
        .order('scheduled_date', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions with coach:', sessionsError);
        return res.status(500).json({ error: 'Failed to fetch coach details' });
      }

      const formattedSessions = sessions?.map(session => ({
        id: session.id,
        date: session.scheduled_date,
        duration: session.duration,
        status: session.status,
        notes: session.notes || '',
        videoUrl: session.video_url || '',
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

      // Update session with feedback
      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update({ 
          client_feedback: feedback,
          client_rating: rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select('id, client_feedback, client_rating')
        .single();

      if (updateError) {
        console.error('Error updating session feedback:', updateError);
        return res.status(500).json({ error: 'Failed to update feedback' });
      }

      res.json({ 
        message: 'Feedback updated successfully',
        session: {
          id: updatedSession.id,
          feedback: updatedSession.client_feedback,
          rating: updatedSession.client_rating,
        }
      });
    } catch (error) {
      console.error('Error updating session feedback:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  },
};
