import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob?: Blob;
  audioBlobUrl?: string;
  error?: string;
}

interface UseRecordAudioOptions {
  maxDuration?: number; // Maximum recording duration in seconds
  mimeType?: string; // Audio MIME type
  onError?: (error: string) => void;
}

export default function useRecordAudio({
  maxDuration = 300, // 5 minutes as default
  mimeType = 'audio/webm',
  onError,
}: UseRecordAudioOptions = {}) {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Stop all tracks in the media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Release object URL if exists
      if (state.audioBlobUrl) {
        URL.revokeObjectURL(state.audioBlobUrl);
      }
    };
  }, [state.audioBlobUrl]);

  // Handle errors
  const handleError = useCallback(
    (errorMessage: string) => {
      setState((prev) => ({ ...prev, error: errorMessage, isRecording: false, isPaused: false }));
      if (onError) {
        onError(errorMessage);
      }
    },
    [onError]
  );

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: undefined,
        audioBlobUrl: undefined,
        error: undefined,
      }));

      // Clear old data
      audioChunksRef.current = [];
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Request microphone access
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create media recorder with the specified MIME type
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm',
      });

      // Store audio chunks when data is available
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      // Handle recording completed
      recorder.addEventListener('stop', () => {
        // Create a Blob from the audio chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm',
        });
        // Create a URL for the audio Blob
        const audioBlobUrl = URL.createObjectURL(audioBlob);

        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob,
          audioBlobUrl,
        }));

        // Stop all tracks in the media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      });

      // Start the recorder
      recorder.start();
      mediaRecorderRef.current = recorder;

      // Start a timer to track duration and enforce max duration
      timerRef.current = window.setInterval(() => {
        setState((prev) => {
          // Check if we've reached the maximum duration
          if (prev.duration >= maxDuration) {
            // Stop recording if max duration is reached
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            // Clear the interval
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return prev; // Duration will be updated in the 'stop' event handler
          }
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      handleError(
        t('errors.microphoneAccess', 'Failed to access microphone. Please check permissions.')
      );
    }
  }, [maxDuration, mimeType, t, handleError]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording' &&
      mediaRecorderRef.current.pause
    ) {
      // Only newer browsers support pausing
      try {
        mediaRecorderRef.current.pause();
        setState((prev) => ({ ...prev, isPaused: true }));
        // Pause the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (error) {
        console.error('Error pausing recording:', error);
        handleError(t('errors.pauseUnsupported', 'Pausing recordings is not supported in your browser.'));
      }
    }
  }, [t, handleError]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'paused' &&
      mediaRecorderRef.current.resume
    ) {
      try {
        mediaRecorderRef.current.resume();
        setState((prev) => ({ ...prev, isPaused: false }));
        // Resume the timer
        timerRef.current = window.setInterval(() => {
          setState((prev) => {
            if (prev.duration >= maxDuration) {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
              }
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              return prev;
            }
            return { ...prev, duration: prev.duration + 1 };
          });
        }, 1000);
      } catch (error) {
        console.error('Error resuming recording:', error);
        handleError(t('errors.resumeUnsupported', 'Resuming recordings is not supported in your browser.'));
      }
    }
  }, [maxDuration, t, handleError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Stop the recorder if it's active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Reset recording
  const resetRecording = useCallback(() => {
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Stop the recorder if it's active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Stop all tracks in the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    // Release object URL if exists
    if (state.audioBlobUrl) {
      URL.revokeObjectURL(state.audioBlobUrl);
    }
    // Reset state
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: undefined,
      audioBlobUrl: undefined,
      error: undefined,
    });
    // Clear audio chunks
    audioChunksRef.current = [];
  }, [state.audioBlobUrl]);

  // Format the duration as MM:SS
  const formattedDuration = useCallback(() => {
    const minutes = Math.floor(state.duration / 60);
    const seconds = state.duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [state.duration]);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    formattedDuration,
  };
} 