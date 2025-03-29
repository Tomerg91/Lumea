import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/components/ui/audio-recorder";
import { useAudioUpload } from "@/hooks/use-audio-upload";
import { Mic, Loader2 } from "lucide-react";

interface AudioRecordingProps {
  entityId?: number;
  entityType: "reflection" | "session";
  onSaved?: (updatedEntity: any) => void;
  initialAudioUrl?: string;
}

export function AudioRecordingCard({
  entityId,
  entityType,
  onSaved,
  initialAudioUrl,
}: AudioRecordingProps) {
  const [showRecorder, setShowRecorder] = useState(false);
  const { 
    uploadAudio, 
    attachAudioToReflection, 
    attachAudioToSession, 
    isUploading, 
    uploadProgress 
  } = useAudioUpload();

  const handleAudioSave = async (audioBlob: Blob) => {
    if (!entityId) return;
    
    // First upload the audio file
    const audioPath = await uploadAudio(audioBlob);
    
    if (!audioPath) return;
    
    // Then attach it to the entity (reflection or session)
    let updatedEntity;
    
    if (entityType === "reflection") {
      updatedEntity = await attachAudioToReflection(entityId, audioPath);
    } else {
      updatedEntity = await attachAudioToSession(entityId, audioPath);
    }
    
    if (updatedEntity && onSaved) {
      onSaved(updatedEntity);
    }
    
    setShowRecorder(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {entityType === "reflection" ? "Voice Reflection" : "Session Voice Notes"}
        </CardTitle>
        <CardDescription>
          {entityType === "reflection" 
            ? "Record your thoughts about this session" 
            : "Record notes about this coaching session"}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {showRecorder ? (
          <AudioRecorder
            onSave={handleAudioSave}
            onCancel={() => setShowRecorder(false)}
            initialAudioUrl={initialAudioUrl}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            {initialAudioUrl ? (
              <div className="w-full">
                <audio src={initialAudioUrl} controls className="w-full" />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Audio recording available. Click below to record a new one.
                </p>
              </div>
            ) : (
              <>
                <Mic className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  No audio recording yet. Click below to start recording.
                </p>
              </>
            )}
          </div>
        )}
        
        {isUploading && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Uploading: {Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        {!showRecorder && (
          <Button 
            onClick={() => setShowRecorder(true)}
            className="w-full"
            disabled={isUploading}
          >
            {initialAudioUrl ? "Record New Audio" : "Start Recording"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}