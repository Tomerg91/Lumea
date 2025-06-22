import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SessionList, { SessionStatus, Session as ComponentSession } from '../components/SessionList';
import MobileSessionList from '../components/mobile/MobileSessionList';
import MobileFloatingActionButton from '../components/mobile/MobileFloatingActionButton';
import SessionModal from '../components/SessionModal';
import { useRealtimeSessions, useCreateSession, useUpdateSession, Session as SupabaseSession } from '../hooks/useSessions';
import useClientsData from '../hooks/useClientsData';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';

const SessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use Supabase real-time hooks instead of mock data
  const { data: supabaseSessions = [], isLoading, error, refetch } = useRealtimeSessions();
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const { clients } = useClientsData(1, 100); // Fetch all clients for dropdown

  // Transform Supabase session data to component format
  const sessions = useMemo(() => {
    return supabaseSessions.map((session: SupabaseSession): ComponentSession => {
      // Map status from Supabase format to component format
      const statusMap: { [key: string]: SessionStatus } = {
        'Upcoming': 'pending',
        'Completed': 'completed',
        'Cancelled': 'cancelled',
        'Rescheduled': 'pending' // Treat rescheduled as pending
      };

      return {
        _id: session.id,
        coachId: session.coach_id,
        clientId: session.client_id,
        client: session.client ? {
          _id: session.client.id,
          firstName: session.client.firstName,
          lastName: session.client.lastName,
          email: session.client.email,
          createdAt: session.created_at
        } : {
          _id: session.client_id,
          firstName: 'Unknown',
          lastName: 'Client',
          email: '',
          createdAt: session.created_at
        },
        date: session.date,
        status: statusMap[session.status] || 'pending',
        notes: session.notes || '',
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    });
  }, [supabaseSessions]);

  const handleCreateSession = (data: { clientId: string; date: string; notes: string }) => {
    createSessionMutation.mutate({
      client_id: data.clientId,
      date: data.date,
      notes: data.notes,
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
      },
    });
  };

  const handleStatusChange = (sessionId: string, newStatus: SessionStatus) => {
    // Map SessionStatus to the expected format
    const statusMap: { [key in SessionStatus]: 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled' } = {
      'pending': 'Upcoming',
      'in-progress': 'Upcoming',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    
    updateSessionMutation.mutate({
      sessionId,
      data: { status: statusMap[newStatus] || 'Upcoming' }
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">{t('sessions.title')}</h1>
        {!isMobile && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-lumea-primary text-white px-4 py-2 rounded-lg hover:bg-lumea-primary-dark transition-colors"
          >
            {t('sessions.createSession')}
          </button>
        )}
      </div>

      {isMobile ? (
        <MobileSessionList
          sessions={sessions}
          isLoading={isLoading}
          onCreateClick={() => setIsModalOpen(true)}
          onStatusChange={handleStatusChange}
          isUpdatingStatus={updateSessionMutation.isPending}
          userRole={profile?.role}
          onRefresh={handleRefresh}
        />
      ) : (
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          onCreateClick={() => setIsModalOpen(true)}
          onStatusChange={handleStatusChange}
          isUpdatingStatus={updateSessionMutation.isPending}
          userRole={profile?.role}
        />
      )}

      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSession={handleCreateSession}
        isLoading={createSessionMutation.isPending}
        clients={clients}
      />

      <MobileFloatingActionButton
        onClick={() => setIsModalOpen(true)}
        label={t('sessions.createSession')}
      />
    </div>
  );
};

export default SessionsPage;
