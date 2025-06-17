import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TextReflectionForm } from '../components/reflections/TextReflectionForm';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ReflectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

        {/* Reflection Form */}
        <TextReflectionForm
          onSubmit={handleSubmitSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default ReflectionsPage; 