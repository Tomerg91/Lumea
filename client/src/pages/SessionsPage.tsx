import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SessionList, { SessionStatus } from '../components/SessionList';
import SessionModal from '../components/SessionModal';
import useSessionsData from '../hooks/useSessionsData';
import useClientsData from '../hooks/useClientsData';
import { useAuth } from '../contexts/AuthContext';

const SessionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { 
    sessions, 
    isLoading, 
    createSession, 
    isCreating,
    updateSessionStatus,
    isUpdatingStatus 
  } = useSessionsData();
  const { clients } = useClientsData(1, 100); // Fetch all clients for dropdown

  const handleCreateSession = (data: { clientId: string; date: string; notes: string }) => {
    createSession(data, {
      onSuccess: () => {
        setIsModalOpen(false);
      },
    });
  };

  const handleStatusChange = (sessionId: string, newStatus: SessionStatus) => {
    updateSessionStatus({ sessionId, status: newStatus });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">{t('sessions.title')}</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-lumea-primary text-white px-4 py-2 rounded-lg hover:bg-lumea-primary-dark transition-colors"
        >
          {t('sessions.createSession')}
        </button>
      </div>

      <SessionList
        sessions={sessions}
        isLoading={isLoading}
        onCreateClick={() => setIsModalOpen(true)}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={isUpdatingStatus}
        userRole={profile?.role}
      />

      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSession={handleCreateSession}
        isLoading={isCreating}
        clients={clients}
      />
    </div>
  );
};

export default SessionsPage;
