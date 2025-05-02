import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Debug logging for MainLayout
  useEffect(() => {
    console.log('[MainLayout] Rendering with profile:', profile);
    console.log('[MainLayout] Current location:', location.pathname);
  }, [profile, location.pathname]);

  // Determine the role prefix for routes based on user role
  const rolePrefix = useMemo(() => {
    const prefix = profile?.role === 'coach' ? '/coach' : '/client';
    console.log('[MainLayout] Using rolePrefix:', prefix);
    return prefix;
  }, [profile?.role]);

  const navItems = useMemo(
    () => [
      {
        label: 'Dashboard',
        path: `${rolePrefix}/dashboard`,
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="7" height="9" x="3" y="3" rx="1"></rect>
            <rect width="7" height="5" x="14" y="3" rx="1"></rect>
            <rect width="7" height="9" x="14" y="12" rx="1"></rect>
            <rect width="7" height="5" x="3" y="16" rx="1"></rect>
          </svg>
        ),
      },
      {
        label: 'Sessions',
        path: `${rolePrefix}/sessions`,
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
            <path d="M8 14h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 18h.01"></path>
            <path d="M12 18h.01"></path>
            <path d="M16 18h.01"></path>
          </svg>
        ),
      },
      {
        label: 'Reflections',
        path: `${rolePrefix}/reflections`,
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 4h6v6"></path>
            <path d="M10 20H4v-6"></path>
            <path d="m20 4-6 6"></path>
            <path d="m4 20 6-6"></path>
          </svg>
        ),
      },
      {
        label: 'Resources',
        path: `${rolePrefix}/resources`,
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
          </svg>
        ),
      },
      {
        label: 'Profile',
        path: `${rolePrefix}/profile`,
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="5"></circle>
            <path d="M20 21a8 8 0 1 0-16 0"></path>
          </svg>
        ),
      },
    ],
    [rolePrefix]
  );

  // Add Clients option for coaches
  const coachNavItems = useMemo(() => {
    if (profile?.role === 'coach') {
      return [
        ...navItems,
        {
          label: 'Clients',
          path: `${rolePrefix}/clients`,
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          ),
        },
      ];
    }
    return navItems;
  }, [navItems, profile?.role, rolePrefix]);

  const handleSignOut = async () => {
    try {
      console.log('[MainLayout] Signing out');
      await signOut();
      console.log('[MainLayout] Sign out successful, navigating to home');
      navigate('/');
    } catch (error) {
      console.error('[MainLayout] Error signing out:', error);
    }
  };

  // If still loading and no profile, show minimal loading UI
  if (loading && !profile) {
    return (
      <div className="min-h-screen lumea-gradient lumea-pattern flex items-center justify-center">
        <div className="text-center p-8">
          <Logo size="sm" />
          <p className="mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Use the appropriate nav items based on role
  const currentNavItems = profile?.role === 'coach' ? coachNavItems : navItems;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <svg className="h-6 w-6" /* Menu Icon */>...</svg>
          <span className="sr-only">Toggle menu</span>
        </button>

        {/* Desktop Logo */}
        <div className="hidden md:flex">
          <Logo size="sm" />
        </div>

        {/* Header Right Section */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 flex h-full flex-col border-r bg-background transition-all duration-300 md:static md:block ${isMobileMenuOpen ? 'w-64' : 'w-0 overflow-hidden md:w-20'}`}
        >
          <nav className="flex flex-col items-center gap-4 px-2 py-5 md:items-stretch">
            {currentNavItems.map((item) => (
              <TooltipProvider key={item.path}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        navigate(item.path);
                        if (isMobileMenuOpen) setIsMobileMenuOpen(false); // Close mobile menu on nav
                      }}
                      className={`flex h-10 items-center justify-center rounded-lg px-3 text-muted-foreground transition-colors hover:text-foreground md:justify-start md:px-4 ${location.pathname === item.path ? 'bg-accent text-accent-foreground' : ''} ${isMobileMenuOpen ? 'w-full justify-start' : 'md:w-full md:h-10'}`}
                    >
                      {item.icon}
                      <span className={`ml-3 ${isMobileMenuOpen ? 'inline' : 'hidden md:hidden'}`}>
                        {item.label}
                      </span>
                      <span className="sr-only">{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  {/* Tooltip only for collapsed desktop view */}
                  {!isMobileMenuOpen && (
                    <TooltipContent side="right" className="hidden md:block">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>
        </aside>

        {/* Mobile Menu Overlay (closes menu on click) */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
