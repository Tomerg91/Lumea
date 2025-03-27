import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Loader2, Search, Calendar, Plus, Video, Edit, Clock, MoreHorizontal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@shared/schema";

export default function CoachSessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newSessionDialog, setNewSessionDialog] = useState(false);
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions/coach"],
    enabled: !!user,
  });
  
  const { data: clientLinks, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/links/coach"],
    enabled: !!user,
  });
  
  const isLoading = sessionsLoading || clientsLoading;

  // New session form state
  const [newSession, setNewSession] = useState({
    clientId: "",
    date: "",
    time: "",
    duration: "60",
    notes: ""
  });
  
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const dateTime = new Date(`${sessionData.date}T${sessionData.time}`);
      await apiRequest("POST", "/api/sessions", {
        coachId: user!.id,
        clientId: parseInt(sessionData.clientId),
        dateTime,
        duration: parseInt(sessionData.duration),
        status: "scheduled",
        textNotes: sessionData.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/coach"] });
      toast({
        title: "פגישה נוצרה בהצלחה",
        description: "הפגישה החדשה נוספה ללוח הזמנים שלך.",
      });
      setNewSessionDialog(false);
      setNewSession({
        clientId: "",
        date: "",
        time: "",
        duration: "60",
        notes: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת פגישה",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter sessions based on search term and group by status
  const filterAndGroupSessions = () => {
    if (!sessions) return { upcoming: [], past: [], cancelled: [] };
    
    const now = new Date();
    
    const filteredSessions = sessions.filter(session => {
      const clientName = clientLinks?.find(link => link.client?.id === session.clientId)?.client?.name?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();
      return clientName.includes(term);
    });
    
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSession(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateSession = () => {
    if (!newSession.clientId || !newSession.date || !newSession.time) {
      toast({
        title: "נתונים חסרים",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }
    
    createSessionMutation.mutate(newSession);
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
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'numeric',
      year: 'numeric',
    };
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">ניהול פגישות</h1>
            <Dialog open={newSessionDialog} onOpenChange={setNewSessionDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600">
                  <Plus className="w-4 h-4 ml-2" /> פגישה חדשה
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>יצירת פגישה חדשה</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="clientId" className="text-sm font-medium">בחר מתאמן</label>
                    <Select 
                      name="clientId" 
                      value={newSession.clientId} 
                      onValueChange={(value) => setNewSession(prev => ({ ...prev, clientId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מתאמן" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientLinks?.filter(link => link.status === "active").map((link) => (
                          <SelectItem key={link.client.id} value={link.client.id.toString()}>
                            {link.client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="date" className="text-sm font-medium">תאריך</label>
                      <Input 
                        id="date" 
                        name="date" 
                        type="date" 
                        value={newSession.date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="time" className="text-sm font-medium">שעה</label>
                      <Input 
                        id="time" 
                        name="time" 
                        type="time" 
                        value={newSession.time}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="duration" className="text-sm font-medium">משך (בדקות)</label>
                    <Select 
                      name="duration" 
                      value={newSession.duration} 
                      onValueChange={(value) => setNewSession(prev => ({ ...prev, duration: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר משך זמן" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 דקות</SelectItem>
                        <SelectItem value="45">45 דקות</SelectItem>
                        <SelectItem value="60">60 דקות</SelectItem>
                        <SelectItem value="90">90 דקות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="notes" className="text-sm font-medium">הערות (אופציונלי)</label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      placeholder="הוסף הערות לפגישה"
                      value={newSession.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewSessionDialog(false)}>ביטול</Button>
                  <Button onClick={handleCreateSession} disabled={createSessionMutation.isPending}>
                    {createSessionMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    יצירת פגישה
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש פגישות לפי שם מתאמן" 
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
                        client={clientLinks?.find(link => link.client?.id === session.clientId)?.client}
                        isUpcoming={true}
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
                        client={clientLinks?.find(link => link.client?.id === session.clientId)?.client}
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
                        client={clientLinks?.find(link => link.client?.id === session.clientId)?.client}
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
  client: any;
  isUpcoming: boolean;
}

function SessionCard({ session, client, isUpcoming }: SessionCardProps) {
  const sessionDate = new Date(session.dateTime);
  const formattedTime = sessionDate.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});
  
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center mb-3 md:mb-0">
          <div className={`${
            isUpcoming ? "bg-primary-100 text-primary-800" : "bg-gray-100 text-gray-800"
          } p-2 rounded-full h-12 w-12 flex items-center justify-center ml-3`}>
            <span>{formattedTime}</span>
          </div>
          <div>
            <h3 className="font-medium">{client?.name || "לקוח"}</h3>
            <div className="text-gray-500 text-sm flex items-center">
              <Calendar className="w-4 h-4 ml-1" />
              {sessionDate.toLocaleDateString('he-IL')}
              <Clock className="w-4 h-4 ml-1 mr-2" />
              {session.duration} דקות
            </div>
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          {isUpcoming ? (
            <>
              <Button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Video className="w-4 h-4 ml-1" /> התחל פגישה
              </Button>
              <Button variant="outline" className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-lg text-sm font-medium">
                <Edit className="w-4 h-4 ml-1" /> ערוך פגישה
              </Button>
            </>
          ) : (
            <Button variant="outline" className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium">
              <Edit className="w-4 h-4 ml-1" /> צפייה בפרטים
            </Button>
          )}
          <Button variant="ghost" className="text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {session.textNotes && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-2">
          <p className="text-gray-600 text-sm">{session.textNotes}</p>
        </div>
      )}
    </div>
  );
}
