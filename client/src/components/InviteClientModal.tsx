import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { Cross2Icon } from '@radix-ui/react-icons';

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string) => void;
  isLoading: boolean;
}

const InviteClientModal: React.FC<InviteClientModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !email.includes('@')) {
      setError(t('validation.invalidEmail'));
      return;
    }

    setError(null);
    onInvite(email);
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {t('clients.inviteClient')}
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>

          <Dialog.Description className="text-gray-600 mb-4">
            {t('clients.inviteDescription')}
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block mb-2 font-medium">
                {t('clients.emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('clients.emailPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lumea-primary"
                required
              />
              {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
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
                  t('clients.sendInvite')
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default InviteClientModal;
