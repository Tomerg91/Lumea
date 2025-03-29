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
      <h1 className="text-3xl font-bold mb-8">Audio Recording Demo</h1>
      
      <p className="text-muted-foreground mb-8">
        This demo showcases the audio recording functionality for both reflections and session notes.
        In a real application, the recordings would be saved to the server and associated with the appropriate entity.
      </p>
      
      <Tabs defaultValue="reflection" className="w-full max-w-3xl mx-auto">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="reflection">Client Reflection</TabsTrigger>
          <TabsTrigger value="session">Coach Session Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reflection" className="space-y-4">
          <h2 className="text-xl font-semibold">Client Reflection Recording</h2>
          <p className="text-muted-foreground mb-4">
            Clients can record audio reflections about their coaching sessions.
            These can be shared with their coach if desired.
          </p>
          
          <AudioRecordingCard
            entityId={1} // Mock reflection ID
            entityType="reflection"
            onSaved={handleReflectionSaved}
            initialAudioUrl={reflectionAudio || undefined}
          />
        </TabsContent>
        
        <TabsContent value="session" className="space-y-4">
          <h2 className="text-xl font-semibold">Coach Session Notes Recording</h2>
          <p className="text-muted-foreground mb-4">
            Coaches can record audio notes about sessions with their clients.
            These notes are private to the coach.
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