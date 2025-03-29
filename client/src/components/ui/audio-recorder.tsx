import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle, Play, Pause, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onSave: (audioBlob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  initialAudioUrl?: string;
}

export function AudioRecorder({
  onSave,
  onCancel,
  maxDuration = 300, // default 5 minutes
  initialAudioUrl,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Initialize audio element for playback
  useEffect(() => {
    const audioElement = new Audio();
    audioElementRef.current = audioElement;
    
    // Set up event listeners for the audio element
    audioElement.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentPlaybackTime(0);
    });
    
    audioElement.addEventListener("timeupdate", () => {
      setCurrentPlaybackTime(audioElement.currentTime);
    });
    
    // Clean up event listeners when component unmounts
    return () => {
      audioElement.removeEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentPlaybackTime(0);
      });
      audioElement.removeEventListener("timeupdate", () => {
        setCurrentPlaybackTime(audioElement.currentTime);
      });
    };
  }, []);
  
  // Load initial audio if provided
  useEffect(() => {
    if (initialAudioUrl && audioElementRef.current) {
      audioElementRef.current.src = initialAudioUrl;
      audioElementRef.current.addEventListener("loadedmetadata", () => {
        if (audioElementRef.current) {
          setAudioDuration(audioElementRef.current.duration);
        }
      });
    }
  }, [initialAudioUrl]);
  
  // Start recording 
  const startRecording = async () => {
    try {
      // Reset state
      setRecordingDuration(0);
      audioChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Combine audio chunks into a single blob
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        
        // Load audio into the audio element for playback
        if (audioElementRef.current) {
          audioElementRef.current.src = url;
          audioElementRef.current.addEventListener("loadedmetadata", () => {
            if (audioElementRef.current) {
              setAudioDuration(audioElementRef.current.duration);
            }
          }, { once: true });
        }
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Set up timer to track recording duration
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please make sure you have granted permission.");
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Toggle playback of recorded audio
  const togglePlayback = () => {
    if (audioElementRef.current && recordedAudioUrl) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play().catch(error => {
          console.error("Error playing audio:", error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handle save button click
  const handleSave = () => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      onSave(audioBlob);
    } else if (initialAudioUrl) {
      // If we're editing an existing recording but didn't re-record, 
      // fetch the initial audio and save it
      fetch(initialAudioUrl)
        .then(response => response.blob())
        .then(blob => onSave(blob))
        .catch(error => {
          console.error("Error fetching initial audio:", error);
        });
    }
  };
  
  // Format time in seconds to MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };
  
  // Calculate progress percentage for progress bar
  const progressPercentage = recordedAudioUrl 
    ? (currentPlaybackTime / audioDuration) * 100 
    : (recordingDuration / maxDuration) * 100;
  
  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      {/* Time display and progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {isRecording ? "מקליט" : recordedAudioUrl ? "השמעה" : "מוכן"}
          </span>
          <span>
            {isRecording ? formatTime(recordingDuration) : 
              recordedAudioUrl ? `${formatTime(currentPlaybackTime)} / ${formatTime(audioDuration)}` : 
              "00:00"}
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all", 
              isRecording ? "bg-red-500" : "bg-primary"
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Control buttons */}
      <div className="flex justify-between items-center">
        <div>
          {!recordedAudioUrl ? (
            // Recording controls
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={recordingDuration >= maxDuration}
              className="rounded-full w-12 h-12"
            >
              {isRecording ? <StopCircle className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
          ) : (
            // Playback controls
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayback}
              className="rounded-full w-12 h-12"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-2" />
            ביטול
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!recordedAudioUrl && !initialAudioUrl}
          >
            <Save className="h-4 w-4 mr-2" />
            שמור
          </Button>
        </div>
      </div>
      
      {/* Recording limit warning */}
      {isRecording && recordingDuration >= maxDuration * 0.8 && (
        <p className="text-sm text-destructive mt-2">
          מתקרב למגבלת הקלטה ({formatTime(maxDuration - recordingDuration)} נותרו)
        </p>
      )}
    </div>
  );
}