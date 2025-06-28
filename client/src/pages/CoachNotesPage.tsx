import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { NotesList } from '../components/notes';
import { ProgressTrackingDashboard } from '../components/notes/ProgressTrackingDashboard';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, Target } from 'lucide-react';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { Card } from '../components/ui/card';

const CoachNotesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [notes, setNotes] = useState<any[]>([]); // This would be populated from the NotesList component
  const isRTL = i18n.language === 'he';
  const { isMobile } = useMobileDetection();

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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-8 text-center sm:text-start">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-500 mb-2">
          {t('pages.coachNotes.title')}
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto sm:mx-0">
          {t('pages.coachNotes.subtitle')}
        </p>
      </div>
      
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm overflow-hidden">
        <Tabs defaultValue="notes" className="w-full">
          <div className="border-b border-gray-200/80">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} bg-transparent p-0 m-0 rounded-none`}>
              <TabsTrigger value="notes" className="py-4 text-base font-semibold flex items-center justify-center gap-2 data-[state=active]:bg-slate-100/80 data-[state=active]:shadow-inner data-[state=active]:text-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-lumea-primary transition-all duration-300">
                <FileText className="w-5 h-5" />
                {t('pages.coachNotes.tabs.notes')}
              </TabsTrigger>
              <TabsTrigger value="progress" className="py-4 text-base font-semibold flex items-center justify-center gap-2 data-[state=active]:bg-slate-100/80 data-[state=active]:shadow-inner data-[state=active]:text-slate-800 rounded-none border-b-2 border-transparent data-[state=active]:border-lumea-primary transition-all duration-300">
                <Target className="w-5 h-5" />
                {t('pages.coachNotes.tabs.progress')}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="notes" className="p-4 sm:p-6">
            <NotesList />
          </TabsContent>
          
          <TabsContent value="progress" className="p-4 sm:p-6">
            <ProgressTrackingDashboard 
              notes={notes}
              onExportProgress={handleExportProgress}
              onSetGoal={handleSetGoal}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default CoachNotesPage; 