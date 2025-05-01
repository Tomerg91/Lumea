import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 hidden md:flex">
            <Link to="/dashboard" className="mr-6 flex items-center space-x-2">
              <Logo size="sm" />
              <span className="font-bold sm:inline-block">Lumea</span> {/* TODO: Translate? */}
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                to="/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {t('nav.dashboard', 'Dashboard')} {/* Placeholder default text */}
              </Link>
              <Link
                to="/sessions"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {t('nav.sessions', 'Sessions')} {/* Placeholder default text */}
              </Link>
              <Link
                to="/profile"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {t('nav.profile', 'Profile')} {/* Placeholder default text */}
              </Link>
            </nav>
          </div>
          {/* TODO: Add mobile navigation toggle */}
          <div className="flex flex-1 items-center justify-end space-x-2">
            <ThemeToggle />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => changeLanguage('en')}
              disabled={i18n.language === 'en'}
            >
              EN
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => changeLanguage('he')}
              disabled={i18n.language === 'he'}
            >
              HE
            </Button>
            {/* Basic Logout Button */}
            {user && (
              <Button variant="outline" size="sm" onClick={signOut} disabled={loading}>
                {loading ? t('common.loading', 'Loading...') : t('nav.logout', 'Logout')}
              </Button>
            )}
            {/* TODO: Add User Profile Dropdown instead of simple button */}
          </div>
        </div>
      </header>
      <main className="flex-1 container max-w-screen-2xl py-6">
        <Outlet /> {/* Page content renders here */}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {t('footer.copyright', 'Lumea. All rights reserved.')}
      </footer>
    </div>
  );
};

export default Layout;
