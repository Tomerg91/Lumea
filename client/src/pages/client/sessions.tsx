import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Calendar, Clock, Video, UserCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@shared/schema";

export default function ClientSessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions/client"],
    enabled: !!user,
  });
  
  const { data: userLinks, isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["/api/links/client"],
    enabled: !!user,
  });
  
  const isLoading = sessionsLoading || linksLoading;
  
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      await apiRequest("PUT", `/api/sessions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/client"] });
      toast({
        title: "פגישה עודכנה בהצלחה",
        description: "סטטוס הפגישה עודכן.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעדכון פגישה",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter sessions based on search term and group by status
  const filterAndGroupSessions = () => {
    if (!sessions) return { upcoming: [], past: [], cancelled: [] };
    
    const now = new Date();
    const filteredSessions = sessions;
    
    return {
      upcoming: filteredSessions.filter(session => 
        new Date(session.dateTime) > now && session.status !== "cancelled"
      ).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
      
      past: filteredSessions.filter(session => 
        new Date(session.dateTime) <= now && session.status !== "cancelled"
      ).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
      
      cancelled: filteredSessions.filter(session => 
        session.status === "cancelled"
      ).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    };
  };
  
  const { upcoming, past, cancelled } = filterAndGroupSessions();
  
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
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'numeric',
      year: 'numeric',
    };
    return `${date.toLocaleDateString('he-IL', dateOptions)}, ${timeString}`;
  };
  
  // Get coach name
  const getCoachName = (coachId: number) => {
    const link = userLinks?.find(link => link.coach?.id === coachId);
    return link?.coach?.name || "מאמן";
  };
  
  const handleChangeStatus = (sessionId: number, status: string) => {
    updateSessionMutation.mutate({ id: sessionId, status });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">הפגישות שלי</h1>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש פגישות" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="upcoming">
              <TabsList className="mb-6">
                <TabsTrigger value="upcoming">פגישות קרובות ({upcoming.length})</TabsTrigger>
                <TabsTrigger value="past">פגישות קודמות ({past.length})</TabsTrigger>
                <TabsTrigger value="cancelled">פגישות מבוטלות ({cancelled.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming">
                {upcoming.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין פגישות קרובות
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcoming.map((session) => (
                      <SessionCard 
                        key={session.id} 
                        session={session} 
                        coachName={getCoachName(session.coachId)}
                        isUpcoming={true}
                        onChangeStatus={handleChangeStatus}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="past">
                {past.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין פגישות קודמות
                  </div>
                ) : (
                  <div className="space-y-4">
                    {past.map((session) => (
                      <SessionCard 
                        key={session.id} 
                        session={session} 
                        coachName={getCoachName(session.coachId)}
                        isUpcoming={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="cancelled">
                {cancelled.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין פגישות מבוטלות
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cancelled.map((session) => (
                      <SessionCard 
                        key={session.id} 
                        session={session} 
                        coachName={getCoachName(session.coachId)}
                        isUpcoming={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  coachName: string;
  isUpcoming: boolean;
  onChangeStatus?: (sessionId: number, status: string) => void;
}

function SessionCard({ session, coachName, isUpcoming, onChangeStatus }: SessionCardProps) {
  const sessionDate = new Date(session.dateTime);
  const formattedTime = sessionDate.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChangeStatus) {
      onChangeStatus(session.id, e.target.value);
    }
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className={`${
              isUpcoming ? "bg-primary-100 text-primary-800" : "bg-gray-100 text-gray-800"
            } p-2 rounded-full h-12 w-12 flex items-center justify-center ml-3`}>
              <span>{formattedTime}</span>
            </div>
            <div>
              <h3 className="font-medium">פגישה עם {coachName}</h3>
              <div className="text-gray-500 text-sm flex items-center">
                <Calendar className="w-4 h-4 ml-1" />
                {sessionDate.toLocaleDateString('he-IL')}
                <Clock className="w-4 h-4 ml-1 mr-2" />
                {session.duration} דקות
              </div>
            </div>
          </div>
          <div className="flex space-x-2 space-x-reverse">
            {isUpcoming && (
              <>
                <Button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Video className="w-4 h-4 ml-1" /> הצטרפות לפגישה
                </Button>
                <Select onValueChange={handleStatusChange} defaultValue={session.status}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="סטטוס פגישה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">
                      <div className="flex items-center">
                        <UserCheck className="w-4 h-4 ml-1" /> מאושר
                      </div>
                    </SelectItem>
                    <SelectItem value="rescheduled">בקשה לשינוי מועד</SelectItem>
                    <SelectItem value="cancelled">ביטול פגישה</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {!isUpcoming && session.status !== "cancelled" && (
              <Button variant="outline" className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium">
                הוספת רפלקציה
              </Button>
            )}
          </div>
        </div>
        {session.textNotes && (
          <div className="px-4 pb-4 pt-2 mt-2 border-t border-gray-100">
            <p className="text-gray-600 text-sm">הערות: {session.textNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
