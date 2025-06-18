import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { NotesList } from '../components/notes';
import { Navigate } from 'react-router-dom';

const CoachNotesPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  // Only coaches should access this page
  if (profile?.role !== 'coach') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('pages.coachNotes.title', 'Coach Notes')}
          </h1>
          <p className="text-gray-600">
            {t('pages.coachNotes.subtitle', 'Manage your private coaching notes with advanced organization and analytics')}
          </p>
        </div>
        
        {/* Use the existing comprehensive NotesList component */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <NotesList />
        </div>
      </div>
    </div>
  );
};

export default CoachNotesPage; 