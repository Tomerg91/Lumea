import { useMemo } from 'react';
import { useSupabaseQuery, useSupabaseSelect } from './useSupabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Analytics data interfaces
export interface AnalyticsOverview {
  totalSessions: number;
  totalClients: number;
  totalCoaches: number;
  totalReflections: number;
  lastUpdated: Date;
}

export interface SessionMetrics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  completionRate: number;
  sessionsByStatus: Record<string, number>;
  averageSessionsPerWeek: number;
  sessionTrends: Array<{
    date: string;
    sessions: number;
    completed: number;
  }>;
}

export interface ClientEngagement {
  totalClients: number;
  activeClients: number;
  clientRetentionRate: number;
  averageSessionsPerClient: number;
  reflectionSubmissionRate: number;
  clientEngagementTrends: Array<{
    date: string;
    activeClients: number;
    reflectionsSubmitted: number;
  }>;
}

export interface CoachPerformance {
  totalCoaches: number;
  activeCoaches: number;
  coaches: Array<{
    coachId: string;
    coachName: string;
    totalSessions: number;
    completedSessions: number;
    totalClients: number;
    averageSessionDuration: number;
    clientSatisfactionScore: number;
    notesTaken: number;
  }>;
}

export interface ReflectionAnalytics {
  totalReflections: number;
  submissionRate: number;
  averageCompletionTime: number;
  reflectionsByCategory: Record<string, number>;
  categoryEngagement: Array<{
    category: string;
    averageScore: number;
    responseCount: number;
  }>;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  sessionMetrics: SessionMetrics;
  clientEngagement: ClientEngagement;
  coachPerformance: CoachPerformance;
  reflectionAnalytics: ReflectionAnalytics;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Hook for fetching overview analytics data
 */
export function useAnalyticsOverview(startDate: Date, endDate: Date) {
  const { user } = useAuth();
  
  return useSupabaseQuery(
    ['analytics', 'overview', startDate.toISOString(), endDate.toISOString()],
    async () => {
      // Get total sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id', { count: 'exact' })
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      // Get total clients (users with role 'client')
      const { data: clientsData } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'client');

      // Get total coaches (users with role 'coach')
      const { data: coachesData } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'coach');

      // Get total reflections
      const { data: reflectionsData } = await supabase
        .from('reflections')
        .select('id', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      return {
        data: {
          totalSessions: sessionsData?.length || 0,
          totalClients: clientsData?.length || 0,
          totalCoaches: coachesData?.length || 0,
          totalReflections: reflectionsData?.length || 0,
          lastUpdated: new Date(),
        },
        error: null,
      };
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'sessions',
      },
    }
  );
}

/**
 * Hook for fetching session metrics
 */
export function useSessionMetrics(startDate: Date, endDate: Date) {
  return useSupabaseQuery(
    ['analytics', 'sessions', startDate.toISOString(), endDate.toISOString()],
    async () => {
      // Get all sessions in date range
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, status, date, notes')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (!sessions) {
        return { data: null, error: new Error('Failed to fetch sessions') };
      }

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'Completed').length;
      const cancelledSessions = sessions.filter(s => s.status === 'Cancelled').length;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      // Group sessions by status
      const sessionsByStatus = sessions.reduce((acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate weekly average
      const weeksBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const averageSessionsPerWeek = weeksBetween > 0 ? totalSessions / weeksBetween : 0;

      // Generate session trends (simplified - group by day)
      const sessionTrends = sessions.reduce((acc, session) => {
        const date = new Date(session.date).toISOString().split('T')[0];
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.sessions += 1;
          if (session.status === 'Completed') existing.completed += 1;
        } else {
          acc.push({
            date,
            sessions: 1,
            completed: session.status === 'Completed' ? 1 : 0,
          });
        }
        return acc;
      }, [] as Array<{ date: string; sessions: number; completed: number }>);

      return {
        data: {
          totalSessions,
          completedSessions,
          cancelledSessions,
          completionRate,
          sessionsByStatus,
          averageSessionsPerWeek,
          sessionTrends,
        },
        error: null,
      };
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'sessions',
      },
    }
  );
}

/**
 * Hook for fetching client engagement metrics
 */
export function useClientEngagement(startDate: Date, endDate: Date) {
  return useSupabaseQuery(
    ['analytics', 'clients', startDate.toISOString(), endDate.toISOString()],
    async () => {
      // Get all clients
      const { data: clients } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client');

      if (!clients) {
        return { data: null, error: new Error('Failed to fetch clients') };
      }

      // Get sessions for clients in date range
      const { data: sessions } = await supabase
        .from('sessions')
        .select('client_id, status, date')
        .in('client_id', clients.map(c => c.id))
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      // Get reflections for clients in date range
      const { data: reflections } = await supabase
        .from('reflections')
        .select('user_id, created_at')
        .in('user_id', clients.map(c => c.id))
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalClients = clients.length;
      
      // Calculate active clients (those with sessions in date range)
      const activeClientIds = new Set(sessions?.map(s => s.client_id) || []);
      const activeClients = activeClientIds.size;

      // Simple retention calculation (clients with sessions in both halves of period)
      const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalfClients = new Set(
        sessions?.filter(s => new Date(s.date) < midDate).map(s => s.client_id) || []
      );
      const secondHalfClients = new Set(
        sessions?.filter(s => new Date(s.date) >= midDate).map(s => s.client_id) || []
      );
      const retainedClients = [...firstHalfClients].filter(id => secondHalfClients.has(id)).length;
      const clientRetentionRate = firstHalfClients.size > 0 ? (retainedClients / firstHalfClients.size) * 100 : 0;

      // Average sessions per client
      const averageSessionsPerClient = activeClients > 0 ? (sessions?.length || 0) / activeClients : 0;

      // Reflection submission rate
      const clientsWithReflections = new Set(reflections?.map(r => r.user_id) || []).size;
      const reflectionSubmissionRate = activeClients > 0 ? (clientsWithReflections / activeClients) * 100 : 0;

      // Generate engagement trends (simplified)
      const clientEngagementTrends = sessions?.reduce((acc, session) => {
        const date = new Date(session.date).toISOString().split('T')[0];
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.activeClients = Math.max(existing.activeClients, activeClients);
        } else {
          acc.push({
            date,
            activeClients,
            reflectionsSubmitted: reflections?.filter(r => 
              new Date(r.created_at).toISOString().split('T')[0] === date
            ).length || 0,
          });
        }
        return acc;
      }, [] as Array<{ date: string; activeClients: number; reflectionsSubmitted: number }>) || [];

      return {
        data: {
          totalClients,
          activeClients,
          clientRetentionRate,
          averageSessionsPerClient,
          reflectionSubmissionRate,
          clientEngagementTrends,
        },
        error: null,
      };
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'sessions',
      },
    }
  );
}

/**
 * Hook for fetching coach performance metrics
 */
export function useCoachPerformance(startDate: Date, endDate: Date) {
  return useSupabaseQuery(
    ['analytics', 'coaches', startDate.toISOString(), endDate.toISOString()],
    async () => {
      // Get all coaches
      const { data: coaches } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'coach');

      if (!coaches) {
        return { data: null, error: new Error('Failed to fetch coaches') };
      }

      const coachData = await Promise.all(
        coaches.map(async (coach) => {
          // Get sessions for this coach
          const { data: sessions } = await supabase
            .from('sessions')
            .select('id, status, date, client_id')
            .eq('coach_id', coach.id)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString());

          // Get coach notes count
          const { data: notes } = await supabase
            .from('coach_notes')
            .select('id', { count: 'exact' })
            .eq('coach_id', coach.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          const totalSessions = sessions?.length || 0;
          const completedSessions = sessions?.filter(s => s.status === 'Completed').length || 0;
          const uniqueClients = new Set(sessions?.map(s => s.client_id) || []).size;
          const averageSessionDuration = 0; // Would need duration field in sessions table
          const clientSatisfactionScore = 0; // Would need feedback/rating system

          return {
            coachId: coach.id,
            coachName: coach.name,
            totalSessions,
            completedSessions,
            totalClients: uniqueClients,
            averageSessionDuration,
            clientSatisfactionScore,
            notesTaken: notes?.length || 0,
          };
        })
      );

      const totalCoaches = coaches.length;
      const activeCoaches = coachData.filter(c => c.totalSessions > 0).length;

      return {
        data: {
          totalCoaches,
          activeCoaches,
          coaches: coachData,
        },
        error: null,
      };
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'sessions',
      },
    }
  );
}

/**
 * Hook for fetching reflection analytics
 */
export function useReflectionAnalytics(startDate: Date, endDate: Date) {
  return useSupabaseQuery(
    ['analytics', 'reflections', startDate.toISOString(), endDate.toISOString()],
    async () => {
      // Get all reflections in date range
      const { data: reflections } = await supabase
        .from('reflections')
        .select('id, user_id, created_at, mood')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!reflections) {
        return { data: null, error: new Error('Failed to fetch reflections') };
      }

      const totalReflections = reflections.length;

      // Get total possible reflections (based on active clients with sessions)
      const { data: sessions } = await supabase
        .from('sessions')
        .select('client_id')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      const activeClients = new Set(sessions?.map(s => s.client_id) || []).size;
      const submissionRate = activeClients > 0 ? (totalReflections / activeClients) * 100 : 0;

      // Group reflections by mood (category)
      const reflectionsByCategory = reflections.reduce((acc, reflection) => {
        const category = reflection.mood || 'neutral';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate category engagement (simplified)
      const categoryEngagement = Object.entries(reflectionsByCategory).map(([category, count]) => ({
        category,
        averageScore: 0,
        responseCount: count,
      }));

      return {
        data: {
          totalReflections,
          submissionRate,
          averageCompletionTime: 0,
          reflectionsByCategory,
          categoryEngagement,
        },
        error: null,
      };
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table: 'reflections',
      },
    }
  );
}

/**
 * Comprehensive analytics hook that combines all analytics data
 */
export function useAnalyticsData(startDate: Date, endDate: Date) {
  const overview = useAnalyticsOverview(startDate, endDate);
  const sessionMetrics = useSessionMetrics(startDate, endDate);
  const clientEngagement = useClientEngagement(startDate, endDate);
  const coachPerformance = useCoachPerformance(startDate, endDate);
  const reflectionAnalytics = useReflectionAnalytics(startDate, endDate);

  const isLoading = overview.isLoading || sessionMetrics.isLoading || 
                   clientEngagement.isLoading || coachPerformance.isLoading || 
                   reflectionAnalytics.isLoading;

  const error = overview.error || sessionMetrics.error || 
                clientEngagement.error || coachPerformance.error || 
                reflectionAnalytics.error;

  const data = useMemo(() => {
    if (!overview.data || !sessionMetrics.data || !clientEngagement.data || 
        !coachPerformance.data || !reflectionAnalytics.data) {
      return null;
    }

    return {
      overview: overview.data,
      sessionMetrics: sessionMetrics.data,
      clientEngagement: clientEngagement.data,
      coachPerformance: coachPerformance.data,
      reflectionAnalytics: reflectionAnalytics.data,
      dateRange: { startDate, endDate },
    };
  }, [overview.data, sessionMetrics.data, clientEngagement.data, 
      coachPerformance.data, reflectionAnalytics.data, startDate, endDate]);

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      overview.refetch();
      sessionMetrics.refetch();
      clientEngagement.refetch();
      coachPerformance.refetch();
      reflectionAnalytics.refetch();
    },
  };
} 