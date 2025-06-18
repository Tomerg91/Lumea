import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { NotesList } from '../components/notes';
import { ProgressTrackingDashboard } from '../components/notes/ProgressTrackingDashboard';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, Target } from 'lucide-react';

const CoachNotesPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [notes, setNotes] = useState<any[]>([]); // This would be populated from the NotesList component

  // Only coaches should access this page
  if (profile?.role !== 'coach') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleExportProgress = (format: 'json' | 'csv' | 'pdf') => {
    console.log(`Exporting progress in ${format} format`);
    // This would integrate with the existing export functionality
  };

  const handleSetGoal = (metric: string, target: number) => {
    console.log(`Setting goal for ${metric}: ${target}`);
    // This would integrate with user preferences/settings
  };

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
        
        {/* Enhanced tabbed interface with progress tracking */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 m-4 rounded-lg">
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes & Management
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Progress & Analytics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="notes" className="m-0 border-0">
              <NotesList />
            </TabsContent>
            
            <TabsContent value="progress" className="m-0 border-0 p-6">
              <ProgressTrackingDashboard 
                notes={notes}
                onExportProgress={handleExportProgress}
                onSetGoal={handleSetGoal}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CoachNotesPage; 