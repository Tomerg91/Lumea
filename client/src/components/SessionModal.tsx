import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Client } from './ClientsTable';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (data: { clientId: string; date: string; notes: string }) => void;
  isLoading: boolean;
  clients: Client[];
}

const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onCreateSession,
  isLoading,
  clients,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ clientId?: string; date?: string }>({});

  const resetForm = () => {
    setClientId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: { clientId?: string; date?: string } = {};
    
    if (!clientId) {
      newErrors.clientId = t('validation.required');
    }
    
    if (!date) {
      newErrors.date = t('validation.required');
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit the form
    onCreateSession({
      clientId,
      date,
      notes,
    });
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {t('sessions.createSession')}
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="client" className="block mb-2 font-medium">
                {t('sessions.selectClient')}
              </label>
              <select
                id="client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-lumea-primary ${
                  errors.clientId ? 'border-red-500' : 'border-gray-300'
                }`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="">{t('sessions.chooseClient')}</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-red-500 text-sm">{errors.clientId}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="date" className="block mb-2 font-medium">
                {t('sessions.sessionDate')}
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-lumea-primary ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-red-500 text-sm">{errors.date}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="notes" className="block mb-2 font-medium">
                {t('sessions.notes')}
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lumea-primary"
                dir={isRTL ? 'rtl' : 'ltr'}
                placeholder={t('sessions.notesPlaceholder')}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-lumea-primary text-white rounded-md hover:bg-lumea-primary-dark transition-colors flex items-center justify-center min-w-[100px]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  t('sessions.create')
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default SessionModal; 