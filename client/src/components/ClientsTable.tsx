import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export type Client = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  lastSessionDate: string | null;
};

interface ClientsTableProps {
  clients: Client[];
  onInviteClick: () => void;
  isLoading: boolean;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients, onInviteClick, isLoading }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('clients.noSessions');
    
    try {
      const date = new Date(dateString);
      return format(date, 'PPP', { locale });
    } catch (error) {
      console.error('Error formatting date:', error);
      return t('clients.invalidDate');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-lumea-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-64 h-64 bg-lumea-light rounded-full mb-4 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-lumea-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('clients.noClientsYet')}</h3>
        <p className="text-gray-600 mb-6">{t('clients.noClientsMessage')}</p>
        <button
          onClick={onInviteClick}
          className="bg-lumea-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-lumea-primary-dark transition-colors"
        >
          {t('clients.inviteClient')}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className={`px-6 py-3 font-medium tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('clients.name')}
            </th>
            <th scope="col" className={`px-6 py-3 font-medium tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('clients.email')}
            </th>
            <th scope="col" className={`px-6 py-3 font-medium tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('clients.lastSession')}
            </th>
            <th scope="col" className="px-6 py-3 relative">
              <span className="sr-only">{t('actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clients.map((client) => (
            <tr key={client._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-lumea-light flex items-center justify-center mr-3">
                    <span className="text-lumea-primary font-semibold">
                      {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{client.firstName} {client.lastName}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-gray-500">{client.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-gray-500">{formatDate(client.lastSessionDate)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-lumea-primary hover:text-lumea-primary-dark">
                  {t('clients.viewDetails')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable; 