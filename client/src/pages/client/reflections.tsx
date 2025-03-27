import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Search, PenTool, Share, Edit, Trash2, CheckSquare, Calendar, Mic } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Reflection } from "@shared/schema";

export default function ClientReflections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newReflectionDialog, setNewReflectionDialog] = useState(false);
  
  const { data: reflections, isLoading: reflectionsLoading } = useQuery<Reflection[]>({
    queryKey: ["/api/reflections/client"],
    enabled: !!user,
  });
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/sessions/client"],
    enabled: !!user,
  });
  
  const isLoading = reflectionsLoading || sessionsLoading;

  // New reflection form state
  const [newReflection, setNewReflection] = useState({
    title: "",
    textEntry: "",
    sessionId: "",
    sharedWithCoach: true
  });
  
  const createReflectionMutation = useMutation({
    mutationFn: async (reflectionData: any) => {
      await apiRequest("POST", "/api/reflections", {
        clientId: user!.id,
        sessionId: reflectionData.sessionId ? parseInt(reflectionData.sessionId) : null,
        title: reflectionData.title,
        textEntry: reflectionData.textEntry,
        sharedWithCoach: reflectionData.sharedWithCoach
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reflections/client"] });
      toast({
        title: "רפלקציה נוצרה בהצלחה",
        description: "הרפלקציה שלך נשמרה בהצלחה.",
      });
      setNewReflectionDialog(false);
      setNewReflection({
        title: "",
        textEntry: "",
        sessionId: "",
        sharedWithCoach: true
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת רפלקציה",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter reflections based on search term
  const filteredReflections = reflections?.filter(reflection => {
    const title = reflection.title.toLowerCase();
    const content = reflection.textEntry.toLowerCase();
    const term = searchTerm.toLowerCase();
    return title.includes(term) || content.includes(term);
  }) || [];
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewReflection(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setNewReflection(prev => ({ ...prev, sharedWithCoach: checked }));
  };
  
  const handleCreateReflection = () => {
    if (!newReflection.title || !newReflection.textEntry) {
      toast({
        title: "נתונים חסרים",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }
    
    createReflectionMutation.mutate(newReflection);
  };
  
  // Get past sessions for session selection dropdown
  const getPastSessions = () => {
    if (!sessions) return [];
    
    const now = new Date();
    
    return sessions
      .filter(session => new Date(session.dateTime) < now && session.status !== "cancelled")
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  };
  
  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
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
            <h1 className="text-2xl font-bold text-gray-800">הרפלקציות שלי</h1>
            <Dialog open={newReflectionDialog} onOpenChange={setNewReflectionDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600">
                  <PenTool className="w-4 h-4 ml-2" /> רפלקציה חדשה
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>יצירת רפלקציה חדשה</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="title" className="text-sm font-medium">כותרת</label>
                    <Input 
                      id="title" 
                      name="title" 
                      placeholder="כותרת הרפלקציה"
                      value={newReflection.title}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="textEntry" className="text-sm font-medium">התוכן שלך</label>
                    <Textarea 
                      id="textEntry" 
                      name="textEntry" 
                      rows={5}
                      placeholder="שתף את המחשבות והתובנות שלך..."
                      value={newReflection.textEntry}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="sessionId" className="text-sm font-medium">בחר פגישה קשורה (אופציונלי)</label>
                    <select 
                      id="sessionId" 
                      name="sessionId" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newReflection.sessionId}
                      onChange={handleInputChange}
                    >
                      <option value="">ללא פגישה ספציפית</option>
                      {getPastSessions().map(session => (
                        <option key={session.id} value={session.id}>
                          {formatDate(session.dateTime)} - פגישה
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">הוספת הקלטה קולית (אופציונלי)</label>
                    <Button type="button" variant="outline" className="flex items-center">
                      <Mic className="w-4 h-4 ml-2" />
                      לחץ להתחלת הקלטה
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id="sharedWithCoach" 
                      checked={newReflection.sharedWithCoach}
                      onCheckedChange={handleCheckboxChange}
                    />
                    <label
                      htmlFor="sharedWithCoach"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      שתף עם המאמן שלי
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewReflectionDialog(false)}>ביטול</Button>
                  <Button onClick={handleCreateReflection} disabled={createReflectionMutation.isPending}>
                    {createReflectionMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    שמירה
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש ברפלקציות" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {filteredReflections.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  אין רפלקציות שנוצרו עדיין
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReflections.map((reflection) => (
                    <ReflectionCard 
                      key={reflection.id} 
                      reflection={reflection} 
                      sessionDate={reflection.sessionId 
                        ? sessions?.find(s => s.id === reflection.sessionId)?.dateTime 
                        : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

interface ReflectionCardProps {
  reflection: Reflection;
  sessionDate?: Date;
}

function ReflectionCard({ reflection, sessionDate }: ReflectionCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('he-IL');
  };
  
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-lg">{reflection.title}</CardTitle>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Calendar className="w-4 h-4 ml-1" />
            {formatDate(reflection.createdAt)}
            {sessionDate && (
              <span className="mr-2">
                • מתייחס לפגישה מתאריך {formatDate(sessionDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          {reflection.sharedWithCoach ? (
            <div className="flex items-center text-green-600 text-sm">
              <CheckSquare className="w-4 h-4 ml-1" />
              משותף עם המאמן
            </div>
          ) : (
            <Button variant="outline" size="sm" className="text-sm">
              <Share className="w-4 h-4 ml-1" /> שתף עם המאמן
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-gray-700 whitespace-pre-line">
          {reflection.textEntry}
        </p>
        <div className="flex justify-end mt-4 space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4 ml-1" /> עריכה
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 hover:bg-red-50">
            <Trash2 className="w-4 h-4 ml-1" /> מחיקה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
