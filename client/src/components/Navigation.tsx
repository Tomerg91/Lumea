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
  Heart,
  FileText
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
        { to: '/coach/notes', icon: <FileText className="w-4 h-4" />, label: t('nav.notes', 'Notes') },
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
    <nav className="nav-modern sticky top-0 z-50">
      <div className={`container-wide ${isRTL ? 'rtl-text-right' : ''}`}>
        <div className={`flex justify-between items-center h-16 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
          {/* Logo */}
          <Link 
            to="/" 
            className={`flex items-center space-x-3 hover:opacity-80 transition-opacity ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Lumea
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {session && roleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-gray-50 ${
                  location.pathname === link.to
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : 'text-gray-600 hover:text-gray-900'
                } ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Notification Center */}
            {session && (
              <div className="mx-2">
                <NotificationCenter />
              </div>
            )}

            {/* Language Switcher */}
            <div className="mx-2">
              <LanguageSwitcher variant="dropdown" />
            </div>

            {/* User Menu */}
            {loading ? (
              <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse"></div>
            ) : session ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 focus-ring ${
                    isRTL ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium max-w-24 truncate text-gray-700">
                    {getProfileName()}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-56 card bg-white rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in`}>
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold truncate text-gray-900">
                        {getProfileName()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {getProfileRole()}
                      </p>
                    </div>
                    <div className="py-2">
                      <Link
                        to={profile?.role === 'coach' ? '/coach/profile' : '/client/profile'}
                        className={`flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 ${
                          isRTL ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>{t('nav.settings')}</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 ${
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
                className="btn btn-primary ml-4"
              >
                {t('nav.signIn')}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 focus-ring"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg animate-fade-in">
            <div className="container-wide py-4">
              {/* Mobile Menu Items */}
              <div className="space-y-2">
                {session && roleLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      location.pathname === link.to
                        ? 'bg-teal-50 text-teal-700 border border-teal-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    } ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}

                {/* Mobile User Section */}
                {session && (
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getProfileName()}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {getProfileRole()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mt-2">
                      <Link
                        to={profile?.role === 'coach' ? '/coach/profile' : '/client/profile'}
                        className={`flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 rounded-xl ${
                          isRTL ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>{t('nav.settings')}</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 rounded-xl ${
                          isRTL ? 'flex-row-reverse space-x-reverse text-start' : 'text-start'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.signOut')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile Auth Button */}
                {!session && (
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        navigate('/auth');
                        setIsOpen(false);
                      }}
                      className="w-full btn btn-primary"
                    >
                      {t('nav.signIn')}
                    </button>
                  </div>
                )}

                {/* Mobile Language Switcher */}
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <LanguageSwitcher variant="mobile" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 