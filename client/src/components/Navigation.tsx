import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  X,
  User,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Users,
  Sparkles
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';

const Navigation = () => {
  const { session, profile, signOut, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentLanguage = i18n.language || 'he';
  const isRTL = currentLanguage === 'he';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
    setUserMenuOpen(false);
  };

  const getRoleBasedLinks = () => {
    if (!session || !profile) return [];

    if (profile.role === 'coach') {
      return [
        { to: '/coach/dashboard', icon: <Home className="w-4 h-4" />, label: t('nav.dashboard') },
        { to: '/coach/clients', icon: <Users className="w-4 h-4" />, label: t('nav.clients') },
        { to: '/coach/sessions', icon: <Calendar className="w-4 h-4" />, label: t('nav.sessions') },
        { to: '/coach/reflections', icon: <MessageSquare className="w-4 h-4" />, label: t('nav.reflections') },
        { to: '/coach/analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' },
        { to: '/coach/resources', icon: <Settings className="w-4 h-4" />, label: t('nav.resources') },
      ];
    }

    if (profile.role === 'client') {
      return [
        { to: '/client/dashboard', icon: <Home className="w-4 h-4" />, label: t('nav.dashboard') },
        { to: '/client/sessions', icon: <Calendar className="w-4 h-4" />, label: t('nav.sessions') },
        { to: '/client/reflections', icon: <MessageSquare className="w-4 h-4" />, label: t('nav.reflections') },
        { to: '/client/resources', icon: <BarChart3 className="w-4 h-4" />, label: t('nav.resources') },
        { to: '/client/profile', icon: <User className="w-4 h-4" />, label: t('nav.profile') },
      ];
    }

    if (profile.role === 'admin') {
      return [
        { to: '/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Console' },
        { to: '/admin/analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' },
      ];
    }

    return [];
  };

  const roleLinks = getRoleBasedLinks();

  const getProfileName = () => {
    return String(profile?.full_name || profile?.name || profile?.email || 'User');
  };

  const getProfileRole = () => {
    return String(profile?.role || 'User');
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  return (
    <nav className="nav-lumea">
      <div className={`container mx-auto px-4 ${isRTL ? 'rtl-text-right' : ''}`}>
        <div className={`flex justify-between items-center h-16 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
          {/* Logo */}
          <Link to="/" className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className="w-10 h-10 bg-gradient-coral-teal rounded-2xl flex items-center justify-center bubble-float">
              <Sparkles className="w-5 h-5 text-white animate-pulse-soft" />
            </div>
            <span className="text-2xl font-bold text-gradient-teal">
              Lumea
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {session && roleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover-lift ${
                  location.pathname === link.to
                    ? 'glass-card-strong text-gradient-teal'
                    : 'glass-card hover-glow'
                } ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Notification Center */}
            {session && <NotificationCenter />}

            {/* Language Switcher */}
            <LanguageSwitcher variant="dropdown" />

            {/* User Menu */}
            {loading ? (
              <div className="w-10 h-10 rounded-2xl bg-gradient-cream-peach animate-pulse-soft"></div>
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center space-x-3 p-2 rounded-xl glass-card hover-lift transition-all duration-300 ${
                    isRTL ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-coral-teal flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium max-w-24 truncate">
                    {getProfileName()}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {userMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-56 glass-card-strong rounded-2xl shadow-lumea-strong overflow-hidden z-50`}>
                    <div className="p-4 bg-gradient-background-subtle border-b border-white/20">
                      <p className="text-sm font-semibold truncate">
                        {getProfileName()}
                      </p>
                      <p className="text-xs opacity-70 capitalize">
                        {getProfileRole()}
                      </p>
                    </div>
                    <div className="py-2">
                      <Link
                        to={profile?.role === 'coach' ? '/coach/profile' : '/client/profile'}
                        className={`flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gradient-background-subtle transition-colors duration-200 ${
                          isRTL ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>{t('nav.settings')}</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50/30 transition-colors duration-200 ${
                          isRTL ? 'flex-row-reverse space-x-reverse text-start' : 'text-start'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.signOut')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="btn-primary"
              >
                {t('nav.signIn')}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl glass-card hover-lift transition-all duration-300"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-white/20 animate-slide-up">
            <div className="py-4 space-y-2">
              {session && roleLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    location.pathname === link.to
                      ? 'glass-card-strong text-gradient-teal'
                      : 'glass-card hover-glow'
                  } ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}

              {/* Mobile Language Switcher */}
              <div className="px-4 py-2">
                <div className="flex items-center justify-between glass-card rounded-xl p-3">
                  <span className="text-sm font-medium">שפה / Language</span>
                  <LanguageSwitcher variant="toggle" />
                </div>
              </div>

              {session ? (
                <div className="border-t border-white/20 pt-4 mt-4">
                  <div className="px-4 py-2">
                    <p className="text-sm font-semibold truncate">
                      {getProfileName()}
                    </p>
                    <p className="text-xs opacity-70 capitalize">
                      {getProfileRole()}
                    </p>
                  </div>
                  <Link
                    to={profile?.role === 'coach' ? '/coach/profile' : '/client/profile'}
                    className={`flex items-center space-x-3 px-4 py-3 text-sm glass-card mx-2 rounded-xl hover-glow transition-colors duration-200 ${
                      isRTL ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>{t('nav.settings')}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className={`w-full flex items-center space-x-3 px-4 py-3 mx-2 mt-2 text-sm text-red-600 glass-card rounded-xl hover:bg-red-50/30 transition-colors duration-200 ${
                      isRTL ? 'flex-row-reverse space-x-reverse text-start' : 'text-start'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('nav.signOut')}</span>
                  </button>
                </div>
              ) : (
                <div className="border-t border-white/20 pt-4 mt-4 px-4">
                  <button
                    onClick={() => {
                      navigate('/auth');
                      setIsOpen(false);
                    }}
                    className="w-full btn-primary"
                  >
                    {t('nav.signIn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for dropdowns */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navigation; 