import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Video, Calendar, Mail, Phone, Mic, FileText, FileAudio, FileVideo } from "lucide-react";
import { t } from "@/lib/i18n";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Session, Resource } from "@shared/schema";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reflection, setReflection] = useState({
    title: "",
    textEntry: "",
    sharedWithCoach: true
  });
  
  const { data: userLinks, isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["/api/links/client"],
    enabled: !!user,
  });
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions/client"],
    enabled: !!user,
  });
  
  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources/client"],
    enabled: !!user,
  });
  
  const { data: reflections, isLoading: reflectionsLoading } = useQuery<any[]>({
    queryKey: ["/api/reflections/client"],
    enabled: !!user,
  });
  
  const isLoading = linksLoading || sessionsLoading || resourcesLoading || reflectionsLoading;
  
  const submitReflectionMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/reflections", {
        clientId: user!.id,
        sessionId: getNextSession()?.id,
        title: data.title,
        textEntry: data.textEntry,
        sharedWithCoach: data.sharedWithCoach
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reflections/client"] });
      toast({
        title: "רפלקציה נשלחה בהצלחה",
        description: "המאמן יוכל לצפות ברפלקציה שלך.",
      });
      setReflection({
        title: "",
        textEntry: "",
        sharedWithCoach: true
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בשליחת רפלקציה",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReflection(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setReflection(prev => ({ ...prev, sharedWithCoach: checked }));
  };
  
  const handleSubmitReflection = () => {
    if (!reflection.title || !reflection.textEntry) {
      toast({
        title: "נתונים חסרים",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }
    
    submitReflectionMutation.mutate(reflection);
  };
  
  // Get coach information
  const getCoach = () => {
    if (!userLinks || userLinks.length === 0) return null;
    return userLinks[0].coach;
  };
  
  // Get next upcoming session
  const getNextSession = () => {
    if (!sessions || sessions.length === 0) return null;
    
    const now = new Date();
    const upcomingSessions = sessions
      .filter(session => new Date(session.dateTime) > now && session.status !== "cancelled")
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    
    return upcomingSessions.length > 0 ? upcomingSessions[0] : null;
  };
  
  // Get a few recent resources
  const getRecentResources = () => {
    if (!resources || resources.length === 0) return [];
    return resources.slice(0, 3);
  };
  
  // Format date for display
  const formatSessionDate = (dateTime: Date) => {
    if (!dateTime) return "";
    
    const date = new Date(dateTime);
    const today = new Date();
    
    // Check if date is today
    const isToday = date.toDateString() === today.toDateString();
    
    // Format time
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const timeString = date.toLocaleTimeString('he-IL', timeOptions);
    
    // For dates
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'numeric',
      year: 'numeric',
    };
    
    return isToday 
      ? `היום, ${timeString}` 
      : `${date.toLocaleDateString('he-IL', dateOptions)}, ${timeString}`;
  };
  
  const coach = getCoach();
  const nextSession = getNextSession();
  const recentResources = getRecentResources();
  
  // Get icon based on resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="text-red-600 text-xl" />;
      case "audio":
        return <FileAudio className="text-green-600 text-xl" />;
      case "video":
        return <FileVideo className="text-purple-600 text-xl" />;
      default:
        return <FileText className="text-blue-600 text-xl" />;
    }
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
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Coach Info */}
              {coach && (
                <Card className="mb-8">
                  <CardContent className="p-6 flex flex-col md:flex-row items-center md:items-start">
                    <Avatar className="w-20 h-20 mb-4 md:mb-0 md:ml-6">
                      <AvatarImage src={coach.profilePicture || ""} alt={coach.name} />
                      <AvatarFallback className="text-lg">{coach.name?.slice(0, 2) || "מ"}</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-right">
                      <h2 className="text-xl font-bold">{t("client.dashboard.myCoach")}: {coach.name}</h2>
                      <p className="text-gray-600 mb-4">מומחה בפיתוח אישי וקריירה</p>
                      <div className="flex flex-wrap justify-center md:justify-start space-x-2 space-x-reverse">
                        <Button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium mb-2">
                          <Mail className="w-4 h-4 ml-1" /> {t("client.dashboard.sendMessage")}
                        </Button>
                        <Button variant="outline" className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-lg text-sm font-medium mb-2">
                          <Phone className="w-4 h-4 ml-1" /> {t("client.dashboard.contact")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Next Session */}
              {nextSession ? (
                <Card className="mb-8 border-t-4 border-primary-500">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">{t("client.dashboard.nextSession")}</h2>
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div className="mb-4 md:mb-0">
                        <div className="text-3xl font-bold text-gray-800">
                          {formatSessionDate(nextSession.dateTime)}
                        </div>
                        <p className="text-gray-600">פגישת אימון אישי עם {coach?.name || "המאמן שלך"}</p>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <Button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium">
                          <Video className="w-4 h-4 ml-1" /> {t("client.dashboard.joinSession")}
                        </Button>
                        <Button variant="outline" className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-3 rounded-lg">
                          <Calendar className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="mb-8">
                  <CardContent className="p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">{t("client.dashboard.nextSession")}</h2>
                    <p className="text-gray-500">אין פגישות מתוכננות כרגע</p>
                    <Button className="mt-4" variant="outline">
                      תיאום פגישה חדשה
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Submit Reflection */}
              <Card className="mb-8">
                <CardHeader className="p-6 border-b">
                  <CardTitle>{t("client.dashboard.submitReflection")}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-gray-700" htmlFor="reflection-title">
                        {t("client.dashboard.reflectionTitle")}
                      </label>
                      <Input 
                        id="reflection-title" 
                        name="title"
                        value={reflection.title}
                        onChange={handleInputChange}
                        placeholder="כותרת הרפלקציה" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-gray-700" htmlFor="reflection-text">
                        {t("client.dashboard.reflectionContent")}
                      </label>
                      <Textarea 
                        id="reflection-text" 
                        name="textEntry"
                        value={reflection.textEntry}
                        onChange={handleInputChange}
                        rows={5} 
                        placeholder="שתף את המחשבות והתובנות שלך..." 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-gray-700 mb-2">
                        {t("client.dashboard.audioRecording")}
                      </label>
                      <Button type="button" variant="outline" className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg w-full">
                        <Mic className="w-4 h-4 ml-2" />
                        <span>{t("client.dashboard.startRecording")}</span>
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Checkbox 
                          id="share-with-coach" 
                          checked={reflection.sharedWithCoach}
                          onCheckedChange={handleCheckboxChange}
                        />
                        <label htmlFor="share-with-coach" className="mr-2 block text-sm text-gray-700">
                          {t("client.dashboard.shareWithCoach")}
                        </label>
                      </div>
                      <Button 
                        onClick={handleSubmitReflection} 
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium"
                        disabled={submitReflectionMutation.isPending}
                      >
                        {submitReflectionMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {t("client.dashboard.submit")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Learning Resources & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Learning Resources */}
                <Card>
                  <CardHeader className="p-6 border-b flex flex-row justify-between items-center">
                    <CardTitle>{t("client.dashboard.learningResources")}</CardTitle>
                    <Link href="/client/resources">
                      <Button variant="link" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                        צפייה בכל החומרים
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="p-6">
                    {recentResources.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        אין חומרי לימוד זמינים כרגע
                      </div>
                    ) : (
                      <div className="divide-y">
                        {recentResources.map((resource) => (
                          <div key={resource.id} className="py-4 flex items-start">
                            <div className={`${
                              resource.type === "pdf" ? "bg-blue-100" :
                              resource.type === "audio" ? "bg-green-100" :
                              resource.type === "video" ? "bg-purple-100" :
                              "bg-gray-100"
                            } p-3 rounded-lg ml-3`}>
                              {getResourceIcon(resource.type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{resource.title}</h4>
                              <p className="text-gray-500 text-sm mb-2">
                                נוסף לפני {new Date(resource.createdAt).toLocaleDateString('he-IL')}
                              </p>
                              <a 
                                href={resource.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary-600 hover:text-primary-800 text-sm"
                              >
                                {resource.type === "pdf" ? "הורדה" : 
                                 resource.type === "audio" ? "האזנה" : 
                                 resource.type === "video" ? "צפייה" : "פתיחה"}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Recent Activity */}
                <Card>
                  <CardHeader className="p-6 border-b">
                    <CardTitle>{t("client.dashboard.recentActivity")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="divide-y">
                      {sessions && sessions.length > 0 && (
                        <div className="py-4">
                          <div className="flex items-center mb-1">
                            <Calendar className="text-primary-600 w-4 h-4 ml-2" />
                            <h4 className="font-medium">השתתפת בפגישת אימון</h4>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {formatSessionDate(sessions[0].dateTime)}
                          </p>
                        </div>
                      )}
                      
                      {reflections && reflections.length > 0 && (
                        <div className="py-4">
                          <div className="flex items-center mb-1">
                            <i className="fas fa-book text-purple-600 ml-2"></i>
                            <h4 className="font-medium">הגשת רפלקציה</h4>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {new Date(reflections[0].createdAt).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      )}
                      
                      {resources && resources.length > 0 && (
                        <div className="py-4">
                          <div className="flex items-center mb-1">
                            <FileText className="text-amber-600 w-4 h-4 ml-2" />
                            <h4 className="font-medium">צפית בחומר לימוד</h4>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {new Date(resources[0].createdAt).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      )}
                      
                      {(!sessions || sessions.length === 0) && 
                       (!reflections || reflections.length === 0) && 
                       (!resources || resources.length === 0) && (
                        <div className="py-4 text-center text-gray-500">
                          אין פעילות אחרונה לתצוגה
                        </div>
                      )}
                    </div>
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
