import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MainLayout from '@/components/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { useSessions, useCreateSession, Session, CreateSessionData } from '@/hooks/useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { CancelSessionModal } from '@/components/ui/CancelSessionModal';
import { RescheduleSessionModal } from '@/components/ui/RescheduleSessionModal';

// Local interface for the new session form data
interface NewSessionFormData {
  date: Date;
  time: string;
  coach: string;
  type: string;
  notes: string;
}

const Sessions = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  // Use the Supabase sessions hooks
  const { 
    data: sessions = [], 
    isLoading, 
    error
  } = useSessions();

  const createSessionMutation = useCreateSession();

  const [newSessionData, setNewSessionData] = useState<NewSessionFormData>({
    date: new Date(),
    time: '',
    coach: '',
    type: '',
    notes: '',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<Session | null>(null);

  const handleCancelSession = (session: Session) => {
    setSessionToCancel(session);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = (cancelledSession: Session) => {
    // The hook will automatically update the cache
    setCancelModalOpen(false);
    setSessionToCancel(null);
  };

  const handleRescheduleSession = (session: Session) => {
    setSessionToReschedule(session);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = (rescheduledSession: Session) => {
    // The hook will automatically update the cache
    setRescheduleModalOpen(false);
    setSessionToReschedule(null);
  };

  const handleCreateSession = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a session.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Transform form data to match CreateSessionData interface
      const createSessionPayload: CreateSessionData = {
        client_id: user.id,
        date: format(newSessionData.date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        notes: newSessionData.notes,
      };

      await createSessionMutation.mutateAsync(createSessionPayload);
      setIsDialogOpen(false);
      setNewSessionData({
        date: new Date(),
        time: '',
        coach: '',
        type: '',
        notes: '',
      });
      toast({
        title: 'Success',
        description: 'Your session has been scheduled.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not create session.',
        variant: 'destructive',
      });
    }
  };

  const sessionsByDate = sessions.reduce<Record<string, Session[]>>((acc, session) => {
    const dateStr = format(new Date(session.date), 'yyyy-MM-dd');
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(session);
    return acc;
  }, {});

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedSessions = selectedDateStr ? sessionsByDate[selectedDateStr] || [] : [];

  if (isLoading && !sessions.length) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto flex justify-center items-center h-[calc(100vh-200px)]">
          <p className="text-xl">Loading sessions...</p>
        </div>
      </MainLayout>
    );
  }

  if (error && !sessions.length) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto flex flex-col justify-center items-center h-[calc(100vh-200px)]">
          <p className="text-xl text-red-500">Error: {error?.message || 'Failed to load sessions'}</p>
          <p>Please try refreshing the page. If the issue persists, the backend might be unavailable.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-playfair mb-2">Sessions</h1>
            <p className="text-muted-foreground">Manage your coaching appointments</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <line x1="12" x2="12" y1="5" y2="19"></line>
                  <line x1="5" x2="19" y1="12" y2="12"></line>
                </svg>
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule a Session</DialogTitle>
                <DialogDescription>
                  Create a new coaching session. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Calendar
                    mode="single"
                    selected={newSessionData.date}
                    onSelect={(date) => date && setNewSessionData({ ...newSessionData, date })}
                    className="rounded-md border p-3"
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newSessionData.time}
                    onChange={(e) => setNewSessionData({ ...newSessionData, time: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="coach">Coach</Label>
                  <Select
                    value={newSessionData.coach}
                    onValueChange={(value) => setNewSessionData({ ...newSessionData, coach: value })}
                  >
                    <SelectTrigger id="coach">
                      <SelectValue placeholder="Select a coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                      <SelectItem value="Michael Chen">Michael Chen</SelectItem>
                      <SelectItem value="Emma Rodriguez">Emma Rodriguez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Session Type</Label>
                  <Select
                    value={newSessionData.type}
                    onValueChange={(value) => setNewSessionData({ ...newSessionData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="One-on-one Session">One-on-one Session</SelectItem>
                      <SelectItem value="Group Session">Group Session</SelectItem>
                      <SelectItem value="Assessment">Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newSessionData.notes}
                    onChange={(e) => setNewSessionData({ ...newSessionData, notes: e.target.value })}
                    placeholder="Add any details or topics you'd like to cover..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90"
                  onClick={handleCreateSession}
                  disabled={!newSessionData.time || !newSessionData.coach || !newSessionData.type || isLoading}
                >
                  Schedule Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <Tabs defaultValue="upcoming" className="mb-8">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <div className="flex justify-end my-4">
            <div className="inline-flex rounded-md border border-input">
              <Button
                variant="ghost"
                className={`rounded-r-none ${view === 'calendar' ? 'bg-muted' : ''}`}
                onClick={() => setView('calendar')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                  <line x1="16" x2="16" y1="2" y2="6"></line>
                  <line x1="8" x2="8" y1="2" y2="6"></line>
                  <line x1="3" x2="21" y1="10" y2="10"></line>
                </svg>
                Calendar
              </Button>
              <Button
                variant="ghost"
                className={`rounded-l-none ${view === 'list' ? 'bg-muted' : ''}`}
                onClick={() => setView('list')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <line x1="8" x2="21" y1="6" y2="6"></line>
                  <line x1="8" x2="21" y1="12" y2="12"></line>
                  <line x1="8" x2="21" y1="18" y2="18"></line>
                  <line x1="3" x2="3.01" y1="6" y2="6"></line>
                  <line x1="3" x2="3.01" y1="12" y2="12"></line>
                  <line x1="3" x2="3.01" y1="18" y2="18"></line>
                </svg>
                List
              </Button>
            </div>
          </div>

          <TabsContent value="upcoming">
            <div
              className={`grid ${view === 'calendar' ? 'grid-cols-1 lg:grid-cols-3 gap-6' : 'grid-cols-1 gap-4'}`}
            >
              {view === 'calendar' && (
                <Card className="lumea-card">
                  <CardHeader>
                    <CardTitle>Calendar View</CardTitle>
                    <CardDescription>Select a date to view sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border w-full"
                    />
                  </CardContent>
                </Card>
              )}

              <div className={view === 'calendar' ? 'lg:col-span-2' : ''}>
                {view === 'calendar' ? (
                  <>
                    <h3 className="text-xl font-medium mb-4">
                      Sessions on{' '}
                      {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Selected Date'}
                    </h3>
                    {selectedSessions.length === 0 && (
                      <Card className="lumea-card">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground mb-4"
                          >
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                            <line x1="16" x2="16" y1="2" y2="6"></line>
                            <line x1="8" x2="8" y1="2" y2="6"></line>
                            <line x1="3" x2="21" y1="10" y2="10"></line>
                          </svg>
                          <p>No sessions scheduled for this date.</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setIsDialogOpen(true)}
                          >
                            Schedule a Session
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    {selectedSessions
                      .filter((session) => session.status === 'Upcoming')
                      .map((session) => (
                        <Card key={session.id} className="lumea-card mb-4">
                          <CardHeader className="pb-2">
                            <CardTitle>
                              {format(new Date(session.date), 'HH:mm')} - {session.client ? `${session.client.firstName} ${session.client.lastName}` : 'Session'}
                            </CardTitle>
                            <CardDescription>with Coach</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {session.notes && <p className="text-sm mb-4">{session.notes}</p>}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRescheduleSession(session)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M12 8v4l3 3"></path>
                                </svg>
                                Reschedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelSession(session)}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1"
                                >
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                                Cancel
                              </Button>
                              <Button
                                className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90"
                                size="sm"
                              >
                                Join Session
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </>
                ) : (
                  <>
                    {sessions
                      .filter((session) => session.status === 'Upcoming')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((session) => (
                        <Card key={session.id} className="lumea-card mb-4">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between">
                              <div>
                                <CardTitle>
                                  {format(new Date(session.date), 'MMMM d, yyyy')} at {format(new Date(session.date), 'HH:mm')}
                                </CardTitle>
                                <CardDescription>
                                  Session with {session.client ? `${session.client.firstName} ${session.client.lastName}` : 'Coach'}
                                </CardDescription>
                              </div>
                              <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium px-2.5 py-0.5 rounded-full h-fit">
                                Upcoming
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {session.notes && <p className="text-sm mb-4">{session.notes}</p>}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRescheduleSession(session)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M12 8v4l3 3"></path>
                                </svg>
                                Reschedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelSession(session)}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1"
                                >
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                                Cancel
                              </Button>
                              <Button
                                className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90"
                                size="sm"
                              >
                                Join Session
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    {sessions.filter((session) => session.status === 'Upcoming').length === 0 && (
                      <Card className="lumea-card">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground mb-4"
                          >
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                            <line x1="16" x2="16" y1="2" y2="6"></line>
                            <line x1="8" x2="8" y1="2" y2="6"></line>
                            <line x1="3" x2="21" y1="10" y2="10"></line>
                          </svg>
                          <p>No upcoming sessions.</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setIsDialogOpen(true)}
                          >
                            Schedule a Session
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="past">
            <div className="grid grid-cols-1 gap-4">
              {sessions
                .filter((session) => session.status === 'Completed')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((session) => (
                  <Card key={session.id} className="lumea-card">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle>
                            {format(new Date(session.date), 'MMMM d, yyyy')} at {format(new Date(session.date), 'HH:mm')}
                          </CardTitle>
                          <CardDescription>
                            Session with {session.client ? `${session.client.firstName} ${session.client.lastName}` : 'Coach'}
                          </CardDescription>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full h-fit">
                          Completed
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {session.notes && <p className="text-sm mb-4">{session.notes}</p>}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Summary
                        </Button>
                        <Button variant="outline" size="sm">
                          Book Follow-up
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {sessions.filter((session) => session.status === 'Completed').length === 0 && (
                <Card className="lumea-card">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground mb-4"
                    >
                      <clock></clock>
                    </svg>
                    <p>No past sessions yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cancelled">
            <div className="grid grid-cols-1 gap-4">
              {sessions
                .filter((session) => session.status === 'Cancelled')
                .map((session) => (
                  <Card key={session.id} className="lumea-card">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle>
                            {format(new Date(session.date), 'MMMM d, yyyy')} at {format(new Date(session.date), 'HH:mm')}
                          </CardTitle>
                          <CardDescription>
                            Session with {session.client ? `${session.client.firstName} ${session.client.lastName}` : 'Coach'}
                          </CardDescription>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium px-2.5 py-0.5 rounded-full h-fit">
                          Cancelled
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {session.notes && <p className="text-sm mb-4">{session.notes}</p>}
                      <Button variant="outline" size="sm">
                        Reschedule
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              {sessions.filter((session) => session.status === 'Cancelled').length === 0 && (
                <Card className="lumea-card">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground mb-4"
                    >
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                    <p>No cancelled sessions.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CancelSessionModal
        session={sessionToCancel}
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSessionToCancel(null);
        }}
        onCancelSuccess={handleCancelSuccess}
      />

      <RescheduleSessionModal
        session={sessionToReschedule}
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setSessionToReschedule(null);
        }}
        onRescheduleSuccess={handleRescheduleSuccess}
      />
    </MainLayout>
  );
};

export default Sessions;
