import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, Calendar, TrendingUp, Star, Sparkles, Heart, Zap } from 'lucide-react';

const HomePage = () => {
  const { session, profile } = useAuth();
  const { isRTL, t } = useLanguage();
  const navigate = useNavigate();

  const navigateToLogin = () => {
    navigate('/auth');
  };

  const navigateToDashboard = () => {
    if (profile?.role === 'coach') {
      navigate('/coach/dashboard');
    } else if (profile?.role === 'client') {
      navigate('/client/dashboard');
    }
  };

  const features = [
    {
      icon: <Users className="w-10 h-10 text-white" />,
      title: t('home.features.coaches.title'),
      description: t('home.features.coaches.description'),
      gradient: 'bg-gradient-teal-blue'
    },
    {
      icon: <Calendar className="w-10 h-10 text-white" />,
      title: t('home.features.scheduling.title'),
      description: t('home.features.scheduling.description'),
      gradient: 'bg-gradient-purple'
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-white" />,
      title: t('home.features.progress.title'),
      description: t('home.features.progress.description'),
      gradient: 'bg-gradient-yellow-peach'
    }
  ];

  const testimonials = [
    {
      name: t('home.testimonials.1.name'),
      role: t('home.testimonials.1.role'),
      content: t('home.testimonials.1.content'),
      rating: 5
    },
    {
      name: t('home.testimonials.2.name'),
      role: t('home.testimonials.2.role'),
      content: t('home.testimonials.2.content'),
      rating: 5
    },
    {
      name: t('home.testimonials.3.name'),
      role: t('home.testimonials.3.role'),
      content: t('home.testimonials.3.content'),
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-pink rounded-full opacity-20 animate-float"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-lavender rounded-full opacity-25 animate-float-delayed"></div>
        <div className="absolute bottom-32 left-32 w-80 h-80 bg-gradient-yellow-peach rounded-full opacity-15 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-gradient-teal-blue rounded-full opacity-20 animate-float-delayed"></div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className={`container mx-auto px-4 ${isRTL ? 'rtl-text-right' : ''}`}>
          <div className={`grid lg:grid-cols-2 gap-12 items-center ${isRTL ? 'lg:grid-flow-col-dense' : ''}`}>
            <div className={`text-center lg:text-${isRTL ? 'right' : 'left'} animate-fade-in`}>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
                <span className="text-gradient-teal">{t('home.hero.title')}</span>
                <br />
                <span className="text-gradient-purple">{t('home.hero.subtitle')}</span>
              </h1>
              <p className="text-xl opacity-80 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {t('home.hero.description')}
              </p>

              {!session ? (
                <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isRTL ? 'lg:justify-end' : 'lg:justify-start'}`}>
                  <button
                    onClick={navigateToLogin}
                    className="btn-primary flex items-center justify-center space-x-2"
                  >
                    <span>{t('home.hero.cta.primary')}</span>
                    <ArrowRight className={`w-5 h-5 ${isRTL ? 'rtl-flip' : ''}`} />
                  </button>
                  <button className="btn-secondary">
                    {t('home.hero.cta.secondary')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg opacity-80 mb-6">
                    {t('home.hero.welcome')} {String(profile?.full_name || profile?.name || profile?.email || 'User')}!
                  </p>
                  <button
                    onClick={navigateToDashboard}
                    className="btn-primary flex items-center justify-center space-x-2"
                  >
                    <span>{t('home.hero.continue')}</span>
                    <ArrowRight className={`w-5 h-5 ${isRTL ? 'rtl-flip' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            <div className={`relative animate-slide-up ${isRTL ? 'lg:order-first' : ''}`}>
              <div className="relative card-lumea-strong p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-teal-blue rounded-2xl flex items-center justify-center animate-pulse-soft">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-6">
                  <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-medium">אימון מותאם אישית / Personalized coaching plans</span>
                  </div>
                  <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-medium">מעקב התקדמות / Progress tracking & insights</span>
                  </div>
                  <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-medium">תיאום גמיש / Flexible session scheduling</span>
                  </div>
                  <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-medium">כלי הרהור / Reflection & mindfulness tools</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className={`text-center mb-16 animate-fade-in ${isRTL ? 'rtl-text-right' : ''}`}>
            <h2 className="text-4xl lg:text-5xl font-bold text-gradient-purple mb-6">
              {t('home.features.title')}
            </h2>
            <p className="text-xl opacity-80 max-w-3xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-lumea group hover-lift bubble-float"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className={`${feature.gradient} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="opacity-80 leading-relaxed text-center">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className={`text-center mb-16 animate-fade-in ${isRTL ? 'rtl-text-right' : ''}`}>
            <h2 className="text-4xl lg:text-5xl font-bold text-gradient-teal mb-6">
              {t('home.testimonials.title')}
            </h2>
            <p className="text-xl opacity-80 max-w-3xl mx-auto">
              {t('home.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="card-lumea-strong hover-lift"
                style={{ animationDelay: `${index * 300}ms` }}
              >
                <div className={`flex mb-4 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="opacity-80 mb-6 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm opacity-60">{testimonial.role}</p>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-pink rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-purple opacity-10"></div>
        <div className="container mx-auto px-4 text-center relative">
          <div className="card-lumea-strong max-w-4xl mx-auto p-12">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-yellow-peach rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gradient-purple mb-6">
              {t('home.cta.title')}
            </h2>
            <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
              {t('home.cta.subtitle')}
            </p>
            
            {!session ? (
              <button
                onClick={navigateToLogin}
                className="btn-primary text-lg px-10 py-5 hover-glow"
              >
                <span>{t('home.cta.button')}</span>
                <ArrowRight className={`w-6 h-6 ml-2 ${isRTL ? 'rtl-flip' : ''}`} />
              </button>
            ) : (
              <button
                onClick={navigateToDashboard}
                className="btn-primary text-lg px-10 py-5 hover-glow"
              >
                <span>{t('home.hero.continue')}</span>
                <ArrowRight className={`w-6 h-6 ml-2 ${isRTL ? 'rtl-flip' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
