import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, CalendarCheck, FileText, MoreHorizontal, Video, Edit } from "lucide-react";
import { t } from "@/lib/i18n";
import { Session, UserLink, Reflection, Payment } from "@shared/schema";
import { ReflectionReminder } from "@/components/reflection-reminder";

export default function CoachDashboard() {
  const { user } = useAuth();
  
  const { data: clients, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/links/coach"],
    enabled: !!user,
  });
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions/coach"],
    enabled: !!user,
  });
  
  const { data: reflections, isLoading: reflectionsLoading } = useQuery<Reflection[]>({
    queryKey: ["/api/reflections/coach"],
    enabled: !!user,
  });
  
  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments/coach"],
    enabled: !!user,
  });
  
  const isLoading = clientsLoading || sessionsLoading || reflectionsLoading || paymentsLoading;
  
  // Functions to filter data
  const getActiveClients = () => clients?.filter(link => link.status === "active").length || 0;
  
  const getWeekSessions = () => {
    if (!sessions) return 0;
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.dateTime);
      return sessionDate >= weekStart && sessionDate < weekEnd;
    }).length;
  };
  
  const getNewReflections = () => {
    if (!reflections) return 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return reflections.filter(reflection => {
      const reflectionDate = new Date(reflection.createdAt);
      return reflectionDate >= yesterday;
    }).length;
  };
  
  const getUpcomingSessions = () => {
    if (!sessions) return [];
    
    const now = new Date();
    return sessions
      .filter(session => new Date(session.dateTime) >= now && session.status !== "cancelled")
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 3);
  };
  
  // Format date for display
  const formatSessionDate = (dateTime: Date) => {
    const date = new Date(dateTime);
    const today = new Date();
    
    // Check if date is today
    const isToday = date.toDateString() === today.toDateString();
    
    // Format time
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const timeString = date.toLocaleTimeString('he-IL', timeOptions);
    
    // Format date
    if (isToday) {
      return `היום, ${timeString}`;
    }
    
    // Check if date is tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isTomorrow) {
      return `מחר, ${timeString}`;
    }
    
    // For other dates
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return `${date.toLocaleDateString('he-IL', dateOptions)}, ${timeString}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <main className="flex-1 bg-gray-50 p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">{t("dashboard.title")}</h1>
          
          {/* Reflection Reminder */}
          <ReflectionReminder />
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-primary-100 p-3 rounded-full">
                        <Users className="text-primary-600 text-xl" />
                      </div>
                      <div className="mr-4">
                        <h3 className="text-gray-500 text-sm">{t("coach.dashboard.activeClients")}</h3>
                        <p className="text-2xl font-bold">{getActiveClients()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-3 rounded-full">
                        <CalendarCheck className="text-amber-600 text-xl" />
                      </div>
                      <div className="mr-4">
                        <h3 className="text-gray-500 text-sm">{t("coach.dashboard.weekSessions")}</h3>
                        <p className="text-2xl font-bold">{getWeekSessions()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full">
                        <FileText className="text-purple-600 text-xl" />
                      </div>
                      <div className="mr-4">
                        <h3 className="text-gray-500 text-sm">{t("coach.dashboard.newReflections")}</h3>
                        <p className="text-2xl font-bold">{getNewReflections()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Upcoming Sessions */}
              <Card className="mb-8">
                <CardHeader className="p-6 border-b flex flex-row justify-between items-center">
                  <CardTitle className="text-xl">{t("coach.dashboard.upcomingSessions")}</CardTitle>
                  <Link href="/coach/sessions">
                    <Button variant="link" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      {t("coach.dashboard.viewAllSessions")}
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6">
                  {getUpcomingSessions().length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      אין פגישות קרובות
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getUpcomingSessions().map((session, index) => (
                        <div key={session.id} className="border border-gray-200 rounded-lg">
                          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center mb-3 md:mb-0">
                              <div className="bg-primary-100 text-primary-800 p-2 rounded-full h-12 w-12 flex items-center justify-center ml-3">
                                <span>{new Date(session.dateTime).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}</span>
                              </div>
                              <div>
                                <h3 className="font-medium">
                                  {clients?.find(c => c.client?.id === session.clientId)?.client?.name || "לקוח"}
                                </h3>
                                <div className="text-gray-500 text-sm">
                                  {formatSessionDate(session.dateTime)}, {session.duration} דקות
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                <Video className="w-4 h-4 ml-1" /> {t("coach.dashboard.startSession")}
                              </Button>
                              <Button variant="ghost" className="text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Client Activity & Upcoming Payments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Client Activity */}
                <Card>
                  <CardHeader className="p-6 border-b">
                    <CardTitle className="text-xl">{t("coach.dashboard.clientActivity")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {reflections && reflections.length > 0 ? (
                      <div className="divide-y">
                        {reflections.slice(0, 3).map((reflection) => {
                          const client = clients?.find(c => c.client?.id === reflection.clientId)?.client;
                          return (
                            <div key={reflection.id} className="py-3 flex items-start">
                              <Avatar className="w-10 h-10 ml-3">
                                <AvatarImage src={client?.profilePicture || ""} alt={client?.name || "Client"} />
                                <AvatarFallback>{client?.name?.slice(0, 2) || "CL"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center">
                                  <h4 className="font-medium">{client?.name || "לקוח"}</h4>
                                  <span className="text-gray-500 text-sm mr-2">
                                    {new Date(reflection.createdAt).toLocaleDateString('he-IL')}
                                  </span>
                                </div>
                                <p className="text-gray-700">הגיש/ה רפלקציה חדשה: {reflection.title}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        אין פעילות אחרונה
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Upcoming Payments */}
                <Card>
                  <CardHeader className="p-6 border-b">
                    <CardTitle className="text-xl">{t("coach.dashboard.upcomingPayments")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {payments && payments.length > 0 ? (
                      <div className="divide-y">
                        {payments
                          .filter(payment => payment.status === "pending")
                          .slice(0, 3)
                          .map((payment) => {
                            const client = clients?.find(c => c.client?.id === payment.clientId)?.client;
                            return (
                              <div key={payment.id} className="py-3 flex justify-between items-center">
                                <div className="flex items-center">
                                  <Avatar className="w-10 h-10 ml-3">
                                    <AvatarImage src={client?.profilePicture || ""} alt={client?.name || "Client"} />
                                    <AvatarFallback>{client?.name?.slice(0, 2) || "CL"}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h4 className="font-medium">{client?.name || "לקוח"}</h4>
                                    <p className="text-gray-500 text-sm">{payment.sessionsCovered} פגישות</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-medium">₪{payment.amount}</div>
                                  <div className="text-xs text-gray-500">
                                    מועד תשלום: {new Date(payment.dueDate).toLocaleDateString('he-IL')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        אין תשלומים קרובים
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
