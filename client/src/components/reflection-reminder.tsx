import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Session } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarCheck, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { he } from "date-fns/locale";

type Participant = {
  id: number;
  name: string;
  profilePicture: string | null;
};

type ReminderResponse = {
  needsReflection: boolean;
  session?: Session;
  participant?: Participant;
};

export function ReflectionReminder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [checkingEnabled, setCheckingEnabled] = useState(true);

  // Check for reflection reminders
  const { data: reminderData, isLoading, refetch } = useQuery<ReminderResponse>({
    queryKey: ["/api/sessions/reminders"],
    enabled: !!user && checkingEnabled && !dismissed,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Mark the reminder as seen in the database
  const markReminderSeenMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const endpoint = `/api/sessions/${sessionId}`;
      const payload = user?.role === "coach" 
        ? { coachReflectionReminderSent: true }
        : { clientReflectionReminderSent: true };
      
      await apiRequest("PUT", endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/reminders"] });
    },
    onError: (error: Error) => {
      console.error("Failed to mark reminder as seen:", error);
    }
  });

  // When a reminder is dismissed
  const handleDismiss = () => {
    if (reminderData?.session?.id) {
      markReminderSeenMutation.mutate(reminderData.session.id);
    }
    setDismissed(true);
    setCheckingEnabled(false);

    // Re-enable checking after some time
    setTimeout(() => {
      setCheckingEnabled(true);
      setDismissed(false);
    }, 1000 * 60 * 30); // 30 minutes
  };

  // Navigate to create reflection page
  const handleCreateReflection = () => {
    if (user?.role === "client") {
      const reminderSession = reminderData?.session;
      if (reminderSession) {
        setLocation(`/client/reflections/new?sessionId=${reminderSession.id}`);
      } else {
        setLocation("/client/reflections/new");
      }
    } else {
      // For coaches, just navigate to the session details
      const reminderSession = reminderData?.session;
      if (reminderSession) {
        setLocation(`/coach/sessions/${reminderSession.id}`);
      } else {
        setLocation("/coach/sessions");
      }
    }
    
    handleDismiss();
  };

  // Format the session date
  const formatSessionDate = (date: Date) => {
    return format(new Date(date), "PPP", { locale: he });
  };

  // If no reminder or dismissed, don't show anything
  if (!reminderData?.needsReflection || dismissed || isLoading) {
    return null;
  }

  const session = reminderData.session;
  const participant = reminderData.participant;

  // Render the reminder component
  return (
    <Alert className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 shadow-lg mb-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <CalendarCheck className="h-6 w-6 text-amber-600 mr-2" />
          <div>
            <AlertTitle className="text-amber-800 text-lg mb-1">
              {user?.role === "client" ? "זמן לרפלקציה" : "מלא משוב על הפגישה"}
            </AlertTitle>
            <AlertDescription className="text-amber-700">
              פגישה הסתיימה לאחרונה ואנו ממליצים למלא רפלקציה כדי לתעד תובנות ולמקסם את התועלת מתהליך האימון.
            </AlertDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-amber-600 hover:text-amber-800 hover:bg-amber-200"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {session && (
        <Card className="mt-4 border border-amber-200 bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-md">
              {formatSessionDate(session.dateTime)} ({session.duration} דקות)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {participant && (
              <div className="flex items-center mb-2">
                <Avatar className="w-8 h-8 ml-2">
                  <AvatarImage src={participant.profilePicture || ""} alt={participant.name} />
                  <AvatarFallback>{participant.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-gray-700 font-medium">
                    {user?.role === "client" ? "מאמן:" : "מתאמן:"} {participant.name}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              onClick={handleCreateReflection}
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              {user?.role === "client" ? "כתוב רפלקציה" : "תעד הערות על פגישה"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </Alert>
  );
}