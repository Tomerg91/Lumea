import { useState } from "react";
import { AudioRecordingCard } from "@/components/audio-recorder-demo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AudioDemoPage() {
  const [reflectionAudio, setReflectionAudio] = useState<string | null>(null);
  const [sessionAudio, setSessionAudio] = useState<string | null>(null);
  
  // Mock functions to simulate the behavior in a real application
  const handleReflectionSaved = (updatedReflection: any) => {
    // In a real app, this would update the cached data or refetch
    console.log("Reflection updated:", updatedReflection);
    // For demo purposes, we'll just store the audio URL
    if (updatedReflection.audioEntry) {
      setReflectionAudio(updatedReflection.audioEntry);
    }
  };
  
  const handleSessionSaved = (updatedSession: any) => {
    // In a real app, this would update the cached data or refetch
    console.log("Session updated:", updatedSession);
    // For demo purposes, we'll just store the audio URL
    if (updatedSession.audioNotes) {
      setSessionAudio(updatedSession.audioNotes);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">הדגמת הקלטת אודיו</h1>
      
      <p className="text-muted-foreground mb-8">
        הדגמה זו מציגה את פונקציונליות הקלטת האודיו עבור רפלקציות והערות מפגש.
        באפליקציה אמיתית, ההקלטות יישמרו בשרת ויקושרו לישות המתאימה.
      </p>
      
      <Tabs defaultValue="reflection" className="w-full max-w-3xl mx-auto">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="reflection">רפלקציה של מתאמן</TabsTrigger>
          <TabsTrigger value="session">הערות מפגש של מאמן</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reflection" className="space-y-4">
          <h2 className="text-xl font-semibold">הקלטת רפלקציה של מתאמן</h2>
          <p className="text-muted-foreground mb-4">
            מתאמנים יכולים להקליט רפלקציות קוליות על מפגשי האימון שלהם.
            ניתן לשתף אותן עם המאמן לפי בחירתם.
          </p>
          
          <AudioRecordingCard
            entityId={1} // Mock reflection ID
            entityType="reflection"
            onSaved={handleReflectionSaved}
            initialAudioUrl={reflectionAudio || undefined}
          />
        </TabsContent>
        
        <TabsContent value="session" className="space-y-4">
          <h2 className="text-xl font-semibold">הקלטת הערות מפגש של מאמן</h2>
          <p className="text-muted-foreground mb-4">
            מאמנים יכולים להקליט הערות קוליות על מפגשים עם המתאמנים שלהם.
            הערות אלה הן פרטיות למאמן.
          </p>
          
          <AudioRecordingCard
            entityId={1} // Mock session ID
            entityType="session"
            onSaved={handleSessionSaved}
            initialAudioUrl={sessionAudio || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}