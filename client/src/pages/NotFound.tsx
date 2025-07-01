import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const NotFound = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
      {/* Language Switcher - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-gradient-to-r from-teal-400 to-green-400 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full blur-xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto px-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>

          {/* 404 Text */}
          <div className="mb-6">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {t('notFound.title', 'Page Not Found')}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              {t('notFound.description', 'The page you are looking for does not exist or has been moved.')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12"
            >
              <Home className={cn(
                "w-5 h-5",
                isRTL ? "ml-2" : "mr-2"
              )} />
              {t('notFound.goHome', 'Go to Home')}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(-1 as any)}
              className="w-full hover:bg-gray-50 h-12"
            >
              <ArrowLeft className={cn(
                "w-5 h-5",
                isRTL ? "ml-2 rotate-180" : "mr-2"
              )} />
              {t('notFound.goBack', 'Go Back')}
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Search className="w-4 h-4" />
              <span>
                {t('notFound.helpText', 'Need help? Contact our support team')}
              </span>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center opacity-80 animate-bounce">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full opacity-60 animate-pulse"></div>
      </div>
    </div>
  );
};

export default NotFound;
