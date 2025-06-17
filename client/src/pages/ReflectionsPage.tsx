import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TextReflectionForm } from '../components/reflections/TextReflectionForm';
import { AudioReflectionForm } from '../components/reflections/AudioReflectionForm';
import { ReflectionsHistory } from '../components/reflections/ReflectionsHistory';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, PenTool, Mic, FileText, History, Plus } from 'lucide-react';

const ReflectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'history' | 'create'>('history');
  const [createTab, setCreateTab] = useState<'text' | 'audio'>('text');

  const handleSubmitSuccess = () => {
    // Navigate back to dashboard after successful submission
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">
              {t('reflections.pageTitle')}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('reflections.pageDescription')}
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'create')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('reflections.history', 'View History')}
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('reflections.create', 'Create New')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history">
            <ReflectionsHistory />
          </TabsContent>
          
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('reflections.chooseType', 'Choose Reflection Type')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={createTab} onValueChange={(value) => setCreateTab(value as 'text' | 'audio')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <PenTool className="h-4 w-4" />
                      {t('reflections.createReflection')}
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      {t('reflections.createAudioReflection')}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="mt-6">
                    <TextReflectionForm 
                      onSubmit={handleSubmitSuccess}
                      onCancel={handleCancel}
                    />
                  </TabsContent>
                  
                  <TabsContent value="audio" className="mt-6">
                    <AudioReflectionForm 
                      onSubmit={handleSubmitSuccess}
                      onCancel={handleCancel}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReflectionsPage; 