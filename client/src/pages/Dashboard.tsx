import React, { useMemo, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QuoteOfTheDay from '@/components/QuoteOfTheDay';
import MainLayout from '@/components/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// ErrorFallback component for QuoteOfTheDay
const QuoteFallback = () => (
  <div className="lumea-card p-6 text-center">
    <p className="text-muted-foreground">Inspiring quote coming soon...</p>
  </div>
);

// Simple wrapper to catch errors in QuoteOfTheDay
const QuoteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('QuoteOfTheDay error:', error);
    return <QuoteFallback />;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // Debug logging for dashboard
  useEffect(() => {
    console.log('[Dashboard] Rendering Dashboard component');
    console.log('[Dashboard] User:', user);
    console.log('[Dashboard] Profile:', profile);
    console.log('[Dashboard] Loading:', loading);
  }, [user, profile, loading]);

  // Determine the role prefix for routes based on user role
  const rolePrefix = useMemo(() => {
    const prefix = profile?.role === 'coach' ? '/coach' : '/client';
    console.log('[Dashboard] Using rolePrefix:', prefix);
    return prefix;
  }, [profile?.role]);

  // If profile is not loaded yet but not in loading state
  if (!profile && !loading) {
    console.log('[Dashboard] No profile but not loading - might be a session issue');
  }

  const upcomingSession = {
    date: new Date(Date.now() + 86400000), // Tomorrow
    coach: 'Sarah Johnson',
    type: 'One-on-one Session',
    notes: 'Focus on mindful breathing techniques and connecting to core values.',
  };

  const lastReflection = {
    date: new Date(Date.now() - 259200000), // 3 days ago
    title: 'Finding Balance',
    excerpt: "Today's session helped me recognize how I've been holding tension in my shoulders...",
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-playfair mb-2">
            Welcome, {(profile?.name || user?.email || 'User') as string}
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="lumea-card col-span-2">
            <CardHeader>
              <CardTitle>Your Next Session</CardTitle>
              <CardDescription>Upcoming coaching appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-lg">
                    {upcomingSession.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    {upcomingSession.date.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    with {upcomingSession.coach}
                  </p>
                  <p className="mt-2 text-sm">{upcomingSession.notes}</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <Button variant="outline" onClick={() => navigate(`${rolePrefix}/sessions`)}>
                    Reschedule
                  </Button>
                  <Button className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90">
                    Join Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lumea-card">
            <CardHeader>
              <CardTitle>Your Last Reflection</CardTitle>
              <CardDescription>
                {lastReflection.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium mb-2">{lastReflection.title}</h3>
              <p className="text-muted-foreground text-sm line-clamp-3">{lastReflection.excerpt}</p>
              <Button
                variant="link"
                className="mt-2 p-0 text-lumea-sage"
                onClick={() => navigate(`${rolePrefix}/reflections`)}
              >
                Continue reading
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              className="h-auto py-6 bg-lumea-sage/20 hover:bg-lumea-sage/30 text-lumea-stone dark:text-lumea-beige"
              onClick={() => navigate(`${rolePrefix}/sessions`)}
            >
              <div className="flex flex-col items-center gap-2">
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
                <span>Schedule Session</span>
              </div>
            </Button>

            <Button
              className="h-auto py-6 bg-lumea-taupe/20 hover:bg-lumea-taupe/30 text-lumea-stone dark:text-lumea-beige"
              onClick={() => navigate(`${rolePrefix}/reflections`)}
            >
              <div className="flex flex-col items-center gap-2">
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
                <span>Write Reflection</span>
              </div>
            </Button>

            <Button
              className="h-auto py-6 bg-lumea-beige/40 hover:bg-lumea-beige/50 text-lumea-stone dark:text-lumea-beige"
              onClick={() => navigate(`${rolePrefix}/resources`)}
            >
              <div className="flex flex-col items-center gap-2">
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
                <span>View Resources</span>
              </div>
            </Button>
          </div>

          <div className="col-span-1">
            <QuoteWrapper>
              <QuoteOfTheDay />
            </QuoteWrapper>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-playfair mb-4">Your Progress</h2>
          <Card className="lumea-card p-6">
            <div className="flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-lumea-beige/50 dark:bg-lumea-stone/30 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-lumea-stone dark:text-lumea-beige"
                >
                  <path d="M12 22v-9"></path>
                  <path d="M15.66 15.66 12 12l-3.66 3.66"></path>
                  <path d="M12 2v9"></path>
                  <path d="M8.34 8.34 12 12l3.66-3.66"></path>
                  <path d="M19 5 5 19"></path>
                  <path d="m19 19-7-7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Progress Tracking Coming Soon</h3>
              <p className="text-muted-foreground max-w-sm">
                Track your emotional and physical patterns over time with our upcoming progress
                feature.
              </p>
              <Button variant="outline" className="mt-4">
                Notify Me
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
