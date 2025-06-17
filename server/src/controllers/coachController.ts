import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export const coachController = {
  async getClients(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const coachId = req.user.id;

      // Find all unique clients that have sessions with this coach
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          client_id,
          client:client_id!inner(id, name, email)
        `)
        .eq('coach_id', coachId);

      if (error) {
        console.error('Error fetching coach clients:', error);
        return res.status(500).json({ error: 'Failed to fetch clients' });
      }

      // Extract unique clients
      const uniqueClients = new Map();
      sessions?.forEach(session => {
        const client = Array.isArray(session.client) ? session.client[0] : session.client;
        if (client && !uniqueClients.has(client.id)) {
          uniqueClients.set(client.id, {
            id: client.id,
            name: client.name,
            email: client.email,
          });
        }
      });

      const clientsWithDetails = Array.from(uniqueClients.values());

      res.json(clientsWithDetails);
    } catch (error) {
      console.error('Error fetching coach clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  },

  async getDashboardStats(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const coachId = req.user.id;

      // Get total sessions
      const { count: totalSessions, error: totalError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', coachId);

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
        .eq('coach_id', coachId)
        .gte('scheduled_date', new Date().toISOString())
        .lte('scheduled_date', sevenDaysFromNow.toISOString())
        .neq('status', 'cancelled');

      if (upcomingError) {
        console.error('Error fetching upcoming sessions:', upcomingError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      // Get unique clients count
      const { data: uniqueClientsData, error: clientsError } = await supabase
        .from('sessions')
        .select('client_id')
        .eq('coach_id', coachId);

      if (clientsError) {
        console.error('Error fetching unique clients:', clientsError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      const uniqueClientsCount = new Set(uniqueClientsData?.map(s => s.client_id)).size;

      // Get recent sessions (last 5)
      const { data: recentSessions, error: recentError } = await supabase
        .from('sessions')
        .select(`
          id,
          date,
          status,
          notes,
          client:client_id!inner(id, name, email)
        `)
        .eq('coach_id', coachId)
        .order('date', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent sessions:', recentError);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
      }

      const recentSessionsFormatted = recentSessions?.map(session => {
        const client = Array.isArray(session.client) ? session.client[0] : session.client;
        return {
          id: session.id,
          date: session.date,
          status: session.status,
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
          },
          notes: session.notes || '',
        };
      }) || [];

      res.json({
        totalSessions: totalSessions || 0,
        upcomingSessions: upcomingSessions || 0,
        totalClients: uniqueClientsCount,
        recentSessions: recentSessionsFormatted,
      });
    } catch (error) {
      console.error('Error fetching coach dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  },

  async getSchedule(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const coachId = req.user.id;
      const { startDate, endDate } = req.query;

      let query = supabase
        .from('sessions')
        .select(`
          id,
          date,
          status,
          notes,
          client:client_id!inner(id, name, email)
        `)
        .eq('coach_id', coachId)
        .order('date', { ascending: true });

      if (startDate && endDate) {
        query = query
          .gte('date', startDate as string)
          .lte('date', endDate as string);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching coach schedule:', error);
        return res.status(500).json({ error: 'Failed to fetch schedule' });
      }

      const formattedSessions = sessions?.map(session => {
        const client = Array.isArray(session.client) ? session.client[0] : session.client;
        return {
          id: session.id,
          date: session.scheduled_date,
          duration: session.duration,
          status: session.status,
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
          },
          notes: session.notes || '',
          videoUrl: session.video_url || '',
        };
      }) || [];

      res.json(formattedSessions);
    } catch (error) {
      console.error('Error fetching coach schedule:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  },

  async getClientDetails(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const coachId = req.user.id;
      const { clientId } = req.params;

      // Verify that this client belongs to this coach
      const { data: hasSession, error: verifyError } = await supabase
        .from('sessions')
        .select('id')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .limit(1)
        .single();

      if (verifyError || !hasSession) {
        return res.status(403).json({ error: 'You do not have access to this client' });
      }

      // Get client details
      const { data: client, error: clientError } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get client sessions with this coach
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, scheduled_date, duration, status, notes, video_url')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching client sessions:', sessionsError);
        return res.status(500).json({ error: 'Failed to fetch client details' });
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
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          joinedAt: client.created_at,
        },
        sessions: formattedSessions,
        totalSessions: sessions?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching client details:', error);
      res.status(500).json({ error: 'Failed to fetch client details' });
    }
  },

  async updateClientNotes(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== 'coach') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const coachId = req.user.id;
      const { clientId } = req.params;
      const { notes } = req.body;

      // Verify that this client belongs to this coach
      const { data: hasSession, error: verifyError } = await supabase
        .from('sessions')
        .select('id')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .limit(1)
        .single();

      if (verifyError || !hasSession) {
        return res.status(403).json({ error: 'You do not have access to this client' });
      }

      // Create or update coach note for this client
      const { data: existingNote, error: checkError } = await supabase
        .from('coach_notes')
        .select('id')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking existing note:', checkError);
        return res.status(500).json({ error: 'Failed to update notes' });
      }

      if (existingNote) {
        // Update existing note
        const { error: updateError } = await supabase
          .from('coach_notes')
          .update({
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingNote.id);

        if (updateError) {
          console.error('Error updating coach note:', updateError);
          return res.status(500).json({ error: 'Failed to update notes' });
        }
      } else {
        // Create new note
        const { error: insertError } = await supabase
          .from('coach_notes')
          .insert({
            coach_id: coachId,
            client_id: clientId,
            notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating coach note:', insertError);
          return res.status(500).json({ error: 'Failed to update notes' });
        }
      }

      res.json({ message: 'Notes updated successfully' });
    } catch (error) {
      console.error('Error updating client notes:', error);
      res.status(500).json({ error: 'Failed to update notes' });
    }
  },
};
