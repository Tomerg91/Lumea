import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAudioUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("audio", audioBlob);

      // Create XMLHttpRequest to track upload progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        // Handle response
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.filePath);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        // Handle errors
        xhr.onerror = () => {
          reject(new Error("Network error occurred during upload"));
        };

        // Open and send the request
        xhr.open("POST", "/api/audio/upload");
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your audio. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Function to update a reflection with audio
  const attachAudioToReflection = async (reflectionId: number, audioPath: string) => {
    try {
      const response = await apiRequest(
        "POST", 
        `/api/reflections/${reflectionId}/audio`, 
        { audioPath }
      );
      
      if (!response.ok) {
        throw new Error("Failed to attach audio to reflection");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error attaching audio to reflection:", error);
      toast({
        title: "Failed to Save",
        description: "There was an error saving your audio to the reflection.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Function to update a session with audio notes
  const attachAudioToSession = async (sessionId: number, audioPath: string) => {
    try {
      const response = await apiRequest(
        "POST", 
        `/api/sessions/${sessionId}/audio`, 
        { audioPath }
      );
      
      if (!response.ok) {
        throw new Error("Failed to attach audio to session");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error attaching audio to session:", error);
      toast({
        title: "Failed to Save",
        description: "There was an error saving your audio to the session.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    uploadAudio,
    attachAudioToReflection,
    attachAudioToSession,
    isUploading,
    uploadProgress,
  };
}