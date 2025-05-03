import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ClientsTable from '../components/ClientsTable';
import InviteClientModal from '../components/InviteClientModal';
import useClientsData from '../hooks/useClientsData';

const ClientsPage: React.FC = () => {
  const { t } = useTranslation();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { clients, isLoading, inviteClient, isInviting } = useClientsData();

  const handleInvite = (email: string) => {
    inviteClient(email, {
      onSuccess: () => {
        setIsInviteModalOpen(false);
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">{t('clients.title')}</h1>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-lumea-primary text-white px-4 py-2 rounded-lg hover:bg-lumea-primary-dark transition-colors"
        >
          {t('clients.inviteClient')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <ClientsTable
          clients={clients}
          isLoading={isLoading}
          onInviteClick={() => setIsInviteModalOpen(true)}
        />
      </div>

      <InviteClientModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        isLoading={isInviting}
      />
    </div>
  );
};

export default ClientsPage; 