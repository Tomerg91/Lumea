import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HomePage = () => {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const navigateToLogin = () => {
    navigate('/auth');
  };

  const navigateToDashboard = () => {
    if (profile?.role === 'coach') {
      navigate('/dashboard');
    } else if (profile?.role === 'client') {
      navigate('/my-dashboard');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          {t('home.welcome', 'Welcome to Satya Coaching')}
        </h1>
        <p className="text-xl mb-8">
          {t('home.tagline', 'Your journey to meaningful change begins here')}
        </p>

        {!session ? (
          <div className="space-y-4">
            <p className="mb-4">
              {t('home.getStarted', 'Get started on your transformation journey today')}
            </p>
            <Button
              onClick={navigateToLogin}
              className="bg-lumea-stone hover:bg-lumea-stone/90 text-lumea-beige px-6 py-3"
            >
              {t('home.loginButton', 'Login / Sign Up')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="mb-4">
              {t('home.welcomeBack', 'Welcome back')}{' '}
              {(profile?.full_name as string) || (profile?.email as string)}!
            </p>
            <Button
              onClick={navigateToDashboard}
              className="bg-lumea-stone hover:bg-lumea-stone/90 text-lumea-beige px-6 py-3"
            >
              {t('home.dashboard', 'Go to Dashboard')}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-lumea-stone/20 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">
            {t('home.feature1Title', 'Personal Growth')}
          </h2>
          <p>
            {t(
              'home.feature1Description',
              'Embark on a journey of self-discovery and personal development with our expert coaches.'
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-lumea-stone/20 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">
            {t('home.feature2Title', 'Tailored Coaching')}
          </h2>
          <p>
            {t(
              'home.feature2Description',
              'Receive personalized coaching sessions designed to meet your unique needs and goals.'
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-lumea-stone/20 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-3">
            {t('home.feature3Title', 'Track Progress')}
          </h2>
          <p>
            {t(
              'home.feature3Description',
              'Monitor your growth and achievements with our intuitive progress tracking tools.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
