import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { format, addDays, isBefore, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Video, Phone, MapPin, Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { Client } from './ClientsTable';
import { useCreateSession } from '../hooks/useSessions';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  preselectedClientId?: string;
  preselectedDate?: string;
  onCreateSession?: (data: { clientId: string; date: string; notes: string; }) => void;
  isLoading?: boolean;
}

const SESSION_TYPES = [
  { value: 'video', label: 'Video Call', icon: Video, color: 'text-blue-600' },
  { value: 'phone', label: 'Phone Call', icon: Phone, color: 'text-green-600' },
  { value: 'in-person', label: 'In Person', icon: MapPin, color: 'text-purple-600' },
] as const;

const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  clients,
  preselectedClientId = '',
  preselectedDate = '',
  onCreateSession,
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const { profile } = useAuth();
  const createSession = useCreateSession();
  
  const locale = isRTL ? he : undefined;
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [clientId, setClientId] = useState(preselectedClientId);
  const [date, setDate] = useState(preselectedDate || format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<'video' | 'phone' | 'in-person'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when props change
  useEffect(() => {
    if (preselectedClientId) setClientId(preselectedClientId);
    if (preselectedDate) setDate(preselectedDate);
  }, [preselectedClientId, preselectedDate]);

  const resetForm = () => {
    setStep('details');
    setClientId(preselectedClientId);
    setDate(preselectedDate || format(new Date(), 'yyyy-MM-dd'));
    setTime('09:00');
    setType('video');
    setTitle('');
    setDescription('');
    setNotes('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!clientId) {
      newErrors.clientId = t('validation.required');
    }

    if (!date) {
      newErrors.date = t('validation.required');
    } else {
      const selectedDate = new Date(`${date}T${time}`);
      const now = new Date();
      if (isBefore(selectedDate, now)) {
        newErrors.date = t('sessions.validation.pastDate', 'Session cannot be scheduled in the past');
      }
    }

    if (!time) {
      newErrors.time = t('validation.required');
    }

    if (!title.trim()) {
      newErrors.title = t('validation.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      setStep('confirm');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const sessionDateTime = new Date(`${date}T${time}`);
    const selectedClient = clients.find(c => c._id === clientId);

    const sessionData = {
      client_id: clientId,
      coach_id: (profile?.id as string) || '',
      date: sessionDateTime.toISOString(),
      time,
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      notes: notes.trim(),
    };

    try {
      if (onCreateSession) {
        // Use parent component's create function
        onCreateSession({
          clientId,
          date: sessionDateTime.toISOString(),
          notes: notes.trim(),
        });
      } else {
        // Use mutation
        await createSession.mutateAsync(sessionData);
      }

      toast({
        title: t('sessions.created'),
        description: t('sessions.createdSuccessfully', {
          client: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : '',
          date: format(sessionDateTime, 'PPP p', { locale })
        }),
      });

      resetForm();
      onClose();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('sessions.createError'),
        variant: 'destructive',
      });
    }
  };

  const selectedClient = clients.find(c => c._id === clientId);
  const sessionDateTime = new Date(`${date}T${time}`);
  const selectedType = SESSION_TYPES.find(t => t.value === type);

  // Generate time options (9 AM to 6 PM, 30-minute intervals)
  const timeOptions = [];
  for (let hour = 9; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break; // Stop at 6:00 PM
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
      timeOptions.push({ value: timeString, label: displayTime });
    }
  }

  const isSubmitting = isLoading || createSession.isPending;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-xl font-semibold text-white">
                {step === 'details' ? t('sessions.createSession') : t('sessions.confirmSession')}
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="rounded-full p-2 hover:bg-white/20 transition-colors"
              >
                <Cross2Icon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {step === 'details' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
                {/* Client Selection */}
                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    {t('sessions.selectClient')}
                  </label>
                  <select
                    id="client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className={cn(
                      'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                      errors.clientId ? 'border-red-500 bg-red-50' : 'border-gray-300',
                      isRTL && 'text-right'
                    )}
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
                    <p className="mt-1 text-red-600 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.clientId}
                    </p>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {t('sessions.sessionDate')}
                    </label>
                    <input
                      id="date"
                      type="date"
                      value={date}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setDate(e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                        errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      )}
                    />
                    {errors.date && (
                      <p className="mt-1 text-red-600 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      {t('sessions.sessionTime')}
                    </label>
                    <select
                      id="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                        errors.time ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      )}
                    >
                      {timeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.time && (
                      <p className="mt-1 text-red-600 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.time}
                      </p>
                    )}
                  </div>
                </div>

                {/* Session Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('sessions.sessionType')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {SESSION_TYPES.map((sessionType) => {
                      const IconComponent = sessionType.icon;
                      return (
                        <button
                          key={sessionType.value}
                          type="button"
                          onClick={() => setType(sessionType.value)}
                          className={cn(
                            'p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2',
                            type === sessionType.value
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          )}
                        >
                          <IconComponent className={cn(
                            'w-6 h-6',
                            type === sessionType.value ? 'text-purple-600' : sessionType.color
                          )} />
                          <span className="text-sm font-medium">{t(`sessions.types.${sessionType.value}`, sessionType.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('sessions.sessionTitle')}
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('sessions.titlePlaceholder', 'e.g., Goal Setting Session')}
                    className={cn(
                      'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                      errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    )}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  {errors.title && (
                    <p className="mt-1 text-red-600 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('sessions.sessionDescription')} <span className="text-gray-500">({t('common.optional')})</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    placeholder={t('sessions.descriptionPlaceholder', 'What will you focus on in this session?')}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('sessions.notes')} <span className="text-gray-500">({t('common.optional')})</span>
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    placeholder={t('sessions.notesPlaceholder')}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={isSubmitting}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg"
                    disabled={isSubmitting}
                  >
                    {t('sessions.reviewSession', 'Review Session')}
                  </button>
                </div>
              </form>
            ) : (
              /* Confirmation Step */
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('sessions.sessionSummary')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('sessions.client')}:</span>
                      <span className="font-medium">
                        {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : ''}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('sessions.dateTime')}:</span>
                      <span className="font-medium">
                        {format(sessionDateTime, 'PPP p', { locale })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('sessions.type')}:</span>
                      <div className="flex items-center">
                        {selectedType && (
                          <>
                            <selectedType.icon className={cn('w-4 h-4 mr-2', selectedType.color)} />
                            <span className="font-medium">{t(`sessions.types.${selectedType.value}`, selectedType.label)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t('sessions.title')}:</span>
                      <span className="font-medium">{title}</span>
                    </div>
                    
                    {description && (
                      <div>
                        <span className="text-gray-600 block mb-1">{t('sessions.description')}:</span>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                          {description}
                        </p>
                      </div>
                    )}
                    
                    {notes && (
                      <div>
                        <span className="text-gray-600 block mb-1">{t('sessions.notes')}:</span>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                          {notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setStep('details')}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={isSubmitting}
                  >
                    {t('common.back')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg flex items-center justify-center min-w-[140px]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      t('sessions.createSession')
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default SessionModal;
