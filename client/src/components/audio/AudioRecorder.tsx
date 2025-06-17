import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import AudioPlayer from './AudioPlayer';
import { useAudioStorage } from '../../hooks/useSupabaseStorage';

// Audio recording states
export type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'completed' | 'error';

// Audio format options with browser compatibility
export const AUDIO_FORMATS = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', extension: 'm4a' },
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
  { mimeType: 'audio/wav', extension: 'wav' }
] as const;

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// iOS detection utility
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Touch device detection
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number, uploadResult?: any) => void;
  onRecordingError?: (error: string) => void;
  maxDuration?: number; // in seconds
  className?: string;
  disabled?: boolean;
  showWaveform?: boolean;
  showPlayer?: boolean; // Show AudioPlayer for completed recordings
  playerOptions?: {
    showWaveform?: boolean;
    showControls?: boolean;
    showVolume?: boolean;
    showSpeed?: boolean;
    showDownload?: boolean;
    autoPlay?: boolean;
  };
  // Mobile-specific props
  mobileOptimized?: boolean;
  compactMode?: boolean;
  // Supabase Storage options
  autoUpload?: boolean; // Automatically upload to Supabase after recording
  uploadOnComplete?: boolean; // Upload when recording is complete
  storageFolder?: string; // Custom folder in storage bucket
}

export interface RecordingData {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
  uploadResult?: any; // Supabase upload result
  isUploaded?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingError,
  maxDuration = 300, // 5 minutes default
  className = '',
  disabled = false,
  showWaveform = true,
  showPlayer = true,
  playerOptions = {
    showWaveform: true,
    showControls: true,
    showVolume: true,
    showSpeed: true,
    showDownload: true,
    autoPlay: false
  },
  mobileOptimized = false,
  compactMode = false,
  autoUpload = false,
  uploadOnComplete = false,
  storageFolder
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { uploadAudio, isUploading, uploadProgress, uploadError } = useAudioStorage();
  
  // Detect mobile environment
  const [isMobileDevice] = useState(() => mobileOptimized || isMobile());
  const [isIOSDevice] = useState(() => isIOS());
  const [isTouchScreen] = useState(() => isTouchDevice());
  
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [supportedMimeType, setSupportedMimeType] = useState<string>('');
  
  // Mobile-specific states
  const [audioContextUnlocked, setAudioContextUnlocked] = useState(!isIOSDevice);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check supported audio formats
  useEffect(() => {
    const findSupportedFormat = () => {
      for (const format of AUDIO_FORMATS) {
        if (MediaRecorder.isTypeSupported(format.mimeType)) {
          setSupportedMimeType(format.mimeType);
          return;
        }
      }
      setSupportedMimeType(''); // No supported format found
    };

    if (typeof MediaRecorder !== 'undefined') {
      findSupportedFormat();
    }
  }, []);

  // Audio level monitoring for waveform visualization
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average audio level
    const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
    const normalizedLevel = average / 255;
    
    setAudioLevel(normalizedLevel);

    if (recordingState === 'recording') {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [recordingState]);

  // Setup audio context for visualization
  const setupAudioContext = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      if (showWaveform) {
        monitorAudioLevel();
      }
    } catch (error) {
      console.warn('Audio context setup failed:', error);
    }
  }, [showWaveform, monitorAudioLevel]);

  // Mobile-specific audio context unlock (required for iOS)
  const unlockAudioContext = useCallback(async () => {
    if (audioContextUnlocked || !isIOSDevice) return true;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a silent audio buffer to unlock the context
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      await audioContext.resume();
      setAudioContextUnlocked(true);
      
      return true;
    } catch (error) {
      console.warn('Failed to unlock audio context:', error);
      return false;
    }
  }, [audioContextUnlocked, isIOSDevice]);

  // Request microphone permission and start recording
  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      setErrorMessage('');

      if (!supportedMimeType) {
        throw new Error(t('audioRecorder.errors.unsupportedBrowser'));
      }

      // Unlock audio context for iOS
      if (isIOSDevice && !audioContextUnlocked) {
        const unlocked = await unlockAudioContext();
        if (!unlocked) {
          throw new Error(t('audioRecorder.errors.audioContextLocked'));
        }
      }

      // Mobile-optimized audio constraints
      const audioConstraints = isMobileDevice ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        // Mobile-specific optimizations
        channelCount: 1, // Mono for mobile to save bandwidth
        latency: 0.1, // Lower latency for mobile
        volume: 1.0
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      };

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      setPermissionGranted(true);
      audioStreamRef.current = stream;
      setupAudioContext(stream);

      // Create MediaRecorder with mobile-optimized settings
      const mediaRecorderOptions = isMobileDevice ? {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 64000 // Lower bitrate for mobile
      } : {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 128000
      };

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const recordingData: RecordingData = {
          blob: audioBlob,
          url: audioUrl,
          duration,
          mimeType: supportedMimeType,
          isUploaded: false
        };

        setRecordingData(recordingData);
        setRecordingState('completed');

        // Handle Supabase upload if enabled
        if ((autoUpload || uploadOnComplete) && !isUploading) {
          try {
            toast({
              title: t('audioRecorder.uploading', 'Uploading audio...'),
              description: t('audioRecorder.uploadingDescription', 'Please wait while your audio is being saved.'),
            });

            const uploadResult = await uploadAudio({
              audioBlob,
              filename: `recording-${Date.now()}.${supportedMimeType.split('/')[1]}`,
              duration,
              options: {
                folder: storageFolder,
                onProgress: (progress) => {
                  // Progress is already handled by the useAudioStorage hook
                  console.log('Upload progress:', progress.percentage + '%');
                }
              }
            });

            // Update recording data with upload result
            const updatedRecordingData: RecordingData = {
              ...recordingData,
              uploadResult,
              isUploaded: true
            };

            setRecordingData(updatedRecordingData);

            toast({
              title: t('audioRecorder.uploadSuccess', 'Audio uploaded successfully'),
              description: t('audioRecorder.uploadSuccessDescription', 'Your audio recording has been saved.'),
            });

            // Call completion callback with upload result
            if (onRecordingComplete) {
              onRecordingComplete(audioBlob, duration, uploadResult);
            }
          } catch (error) {
            console.error('Audio upload failed:', error);
            
            toast({
              title: t('audioRecorder.uploadError', 'Upload failed'),
              description: error instanceof Error ? error.message : t('audioRecorder.uploadErrorDescription', 'Failed to save audio recording.'),
              variant: 'destructive',
            });

            // Still call completion callback without upload result
            if (onRecordingComplete) {
              onRecordingComplete(audioBlob, duration);
            }
          }
        } else {
          // No upload - just call completion callback
          if (onRecordingComplete) {
            onRecordingComplete(audioBlob, duration);
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        const error = t('audioRecorder.errors.recordingFailed');
        setErrorMessage(error);
        setRecordingState('error');
        if (onRecordingError) {
          onRecordingError(error);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording
      mediaRecorder.start(isMobileDevice ? 1000 : 100); // Larger chunks for mobile
      setRecordingState('recording');

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (error: any) {
      let errorMessage = t('audioRecorder.errors.permissionDenied');
      
      if (error.name === 'NotAllowedError') {
        errorMessage = t('audioRecorder.errors.permissionDenied');
        setPermissionGranted(false);
      } else if (error.name === 'NotFoundError') {
        errorMessage = t('audioRecorder.errors.noMicrophone');
      } else if (error.name === 'NotSupportedError') {
        errorMessage = t('audioRecorder.errors.notSupported');
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrorMessage(errorMessage);
      setRecordingState('error');
      
      if (onRecordingError) {
        onRecordingError(errorMessage);
      }
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up timers and contexts
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  }, [recordingState]);

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      // Restart duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    }
  };

  // Reset to initial state
  const resetRecording = () => {
    if (recordingData?.url) {
      URL.revokeObjectURL(recordingData.url);
    }
    
    setRecordingData(null);
    setRecordingState('idle');
    setDuration(0);
    setErrorMessage('');
    setAudioLevel(0);
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (recordingData?.url) {
        URL.revokeObjectURL(recordingData.url);
      }
    };
  }, [stopRecording, recordingData]);

  // Waveform visualization component
  const WaveformDisplay = () => {
    if (!showWaveform) return null;

    const barCount = 20;
    const bars = Array.from({ length: barCount }, (_, index) => {
      const height = recordingState === 'recording' 
        ? Math.max(2, audioLevel * 40 + Math.random() * 10) 
        : 2;
      
      return (
        <div
          key={index}
          className="bg-lumea-primary transition-all duration-75 rounded-sm"
          style={{
            height: `${height}px`,
            minHeight: '2px',
            width: '3px'
          }}
        />
      );
    });

    return (
      <div className="flex items-center justify-center space-x-1 h-12">
        {bars}
      </div>
    );
  };

  return (
    <div className={`audio-recorder bg-white rounded-xl border border-gray-200 shadow-lumea-sm ${
      compactMode ? 'p-4' : 'p-6'
    } ${isMobileDevice ? 'max-w-full' : ''} ${className}`}>
      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      {/* Mobile Permission Warning */}
      {isMobileDevice && permissionGranted === false && (
        <Alert variant="warning" className="mb-4">
          <div className="space-y-2">
            <p className="font-medium">{t('audioRecorder.mobile.permissionRequired')}</p>
            <p className="text-sm">
              {isIOSDevice 
                ? t('audioRecorder.mobile.iosInstructions')
                : t('audioRecorder.mobile.androidInstructions')
              }
            </p>
          </div>
        </Alert>
      )}

      {/* Recording Status */}
      <div className={`text-center ${compactMode ? 'mb-2' : 'mb-4'}`}>
        {recordingState === 'requesting' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lumea-primary"></div>
            <span className={`text-sm text-gray-600 ${isMobileDevice ? 'text-base' : ''}`}>
              {t('audioRecorder.requestingPermission')}
            </span>
          </div>
        )}
        
        {recordingState === 'recording' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className={`text-sm font-medium text-red-600 ${isMobileDevice ? 'text-base' : ''}`}>
              {t('audioRecorder.recording')}
            </span>
          </div>
        )}
        
        {recordingState === 'paused' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className={`text-sm font-medium text-yellow-600 ${isMobileDevice ? 'text-base' : ''}`}>
              {t('audioRecorder.paused')}
            </span>
          </div>
        )}
        
        {recordingState === 'completed' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className={`text-sm font-medium text-green-600 ${isMobileDevice ? 'text-base' : ''}`}>
              {t('audioRecorder.completed')}
            </span>
          </div>
        )}
      </div>

      {/* Waveform Visualization - Responsive */}
      {showWaveform && !compactMode && <WaveformDisplay />}

      {/* Duration Display - Mobile Optimized */}
      <div className={`text-center ${compactMode ? 'my-2' : 'my-4'}`}>
        <span className={`font-mono font-bold text-gray-800 ${
          isMobileDevice ? 'text-3xl' : 'text-2xl'
        }`}>
          {formatDuration(duration)}
        </span>
        {maxDuration && (
          <span className={`text-gray-500 ml-2 ${
            isMobileDevice ? 'text-base' : 'text-sm'
          }`}>
            / {formatDuration(maxDuration)}
          </span>
        )}
      </div>

      {/* Recording Controls - Touch Optimized */}
      <div className={`flex justify-center ${
        isMobileDevice ? 'space-x-4' : 'space-x-3'
      }`}>
        {recordingState === 'idle' && (
          <Button
            onClick={startRecording}
            disabled={disabled || !supportedMimeType}
            variant="lumea"
            size={isMobileDevice ? "lg" : "lg"}
            className={`${isMobileDevice ? 'px-8 py-4 text-lg min-h-[52px] min-w-[160px]' : 'px-8'} 
              ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
          >
            <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            {t('audioRecorder.startRecording')}
          </Button>
        )}

        {recordingState === 'recording' && (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              size={isMobileDevice ? "lg" : "lg"}
              className={`${isMobileDevice ? 'px-6 py-4 text-lg min-h-[52px]' : ''} 
                ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
            >
              <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {isMobileDevice ? t('audioRecorder.pause') : t('audioRecorder.pause')}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="destructive"
              size={isMobileDevice ? "lg" : "lg"}
              className={`${isMobileDevice ? 'px-6 py-4 text-lg min-h-[52px]' : ''} 
                ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
            >
              <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.stop')}
            </Button>
          </>
        )}

        {recordingState === 'paused' && (
          <>
            <Button
              onClick={resumeRecording}
              variant="lumea"
              size={isMobileDevice ? "lg" : "lg"}
              className={`${isMobileDevice ? 'px-6 py-4 text-lg min-h-[52px]' : ''} 
                ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
            >
              <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.resume')}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="destructive"
              size={isMobileDevice ? "lg" : "lg"}
              className={`${isMobileDevice ? 'px-6 py-4 text-lg min-h-[52px]' : ''} 
                ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
            >
              <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.stop')}
            </Button>
          </>
        )}

        {recordingState === 'completed' && (
          <>
            <Button
              onClick={resetRecording}
              variant="outline"
              size={isMobileDevice ? "lg" : "lg"}
              className={`${isMobileDevice ? 'px-8 py-4 text-lg min-h-[52px] min-w-[160px]' : ''} 
                ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
            >
              <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.recordAgain')}
            </Button>

            {/* Manual Upload Button - Show only if not auto-uploaded and not currently uploading */}
            {!autoUpload && !uploadOnComplete && recordingData && !recordingData.isUploaded && !isUploading && (
              <Button
                onClick={async () => {
                  if (recordingData) {
                    try {
                      toast({
                        title: t('audioRecorder.uploading', 'Uploading audio...'),
                        description: t('audioRecorder.uploadingDescription', 'Please wait while your audio is being saved.'),
                      });

                      const uploadResult = await uploadAudio({
                        audioBlob: recordingData.blob,
                        filename: `recording-${Date.now()}.${recordingData.mimeType.split('/')[1]}`,
                        duration: recordingData.duration,
                        options: {
                          folder: storageFolder,
                        }
                      });

                      // Update recording data with upload result
                      setRecordingData({
                        ...recordingData,
                        uploadResult,
                        isUploaded: true
                      });

                      toast({
                        title: t('audioRecorder.uploadSuccess', 'Audio uploaded successfully'),
                        description: t('audioRecorder.uploadSuccessDescription', 'Your audio recording has been saved.'),
                      });
                    } catch (error) {
                      console.error('Manual upload failed:', error);
                      toast({
                        title: t('audioRecorder.uploadError', 'Upload failed'),
                        description: error instanceof Error ? error.message : t('audioRecorder.uploadErrorDescription', 'Failed to save audio recording.'),
                        variant: 'destructive',
                      });
                    }
                  }
                }}
                variant="lumea"
                size={isMobileDevice ? "lg" : "lg"}
                className={`${isMobileDevice ? 'px-8 py-4 text-lg min-h-[52px] min-w-[160px]' : ''} 
                  ${isTouchScreen ? 'active:scale-95' : ''} transition-transform`}
              >
                <svg className={`${isMobileDevice ? 'w-6 h-6' : 'w-5 h-5'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {t('audioRecorder.uploadToCloud', 'Save to Cloud')}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Recording Info - Mobile Optimized */}
      {recordingData && !showPlayer && (
        <div className={`${compactMode ? 'mt-2' : 'mt-4'} p-3 bg-gray-50 rounded-lg`}>
          <div className={`${isMobileDevice ? 'text-base' : 'text-sm'} text-gray-600 space-y-1`}>
            <p>{t('audioRecorder.recordingComplete')}</p>
            <div className={`${isMobileDevice ? 'grid grid-cols-2 gap-2' : 'space-y-1'}`}>
              <p>{t('audioRecorder.duration')}: {formatDuration(recordingData.duration)}</p>
              <p>{t('audioRecorder.size')}: {(recordingData.blob.size / 1024).toFixed(1)} KB</p>
            </div>
            
            {/* Upload Status */}
            {recordingData.isUploaded && (
              <div className="flex items-center space-x-2 mt-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{t('audioRecorder.uploadedToCloud', 'Saved to cloud')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress Display */}
      {isUploading && uploadProgress && (
        <div className={`${compactMode ? 'mt-2' : 'mt-4'} p-4 bg-blue-50 border border-blue-200 rounded-lg`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium text-blue-900 ${isMobileDevice ? 'text-base' : 'text-sm'}`}>
              {t('audioRecorder.uploading', 'Uploading audio...')}
            </span>
            <span className={`text-blue-700 ${isMobileDevice ? 'text-base' : 'text-sm'}`}>
              {uploadProgress.percentage.toFixed(0)}%
            </span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          
          {uploadProgress.timeRemaining && (
            <div className={`text-blue-600 ${isMobileDevice ? 'text-sm' : 'text-xs'}`}>
              {t('audioRecorder.timeRemaining', 'Time remaining: {{time}}s', {
                time: Math.round(uploadProgress.timeRemaining),
              })}
            </div>
          )}
          
          {uploadProgress.speed && (
            <div className={`text-blue-600 ${isMobileDevice ? 'text-sm' : 'text-xs'}`}>
              {t('audioRecorder.uploadSpeed', 'Speed: {{speed}} KB/s', {
                speed: (uploadProgress.speed / 1024).toFixed(1),
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Error Display */}
      {uploadError && (
        <Alert variant="destructive" className={`${compactMode ? 'mt-2' : 'mt-4'}`}>
          <div className="space-y-2">
            <p className="font-medium">{t('audioRecorder.uploadError', 'Upload failed')}</p>
            <p className="text-sm">
              {uploadError instanceof Error ? uploadError.message : t('audioRecorder.uploadErrorDescription', 'Failed to save audio recording.')}
            </p>
          </div>
        </Alert>
      )}

      {/* Audio Player */}
      {showPlayer && recordingData && (
        <div className={`${compactMode ? 'mt-4' : 'mt-6'}`}>
          <h3 className={`font-medium text-gray-900 ${
            compactMode ? 'text-base mb-2' : 'text-lg mb-3'
          } ${isMobileDevice ? 'text-lg' : ''}`}>
            {t('audioRecorder.playback', 'Playback')}
          </h3>
          <AudioPlayer
            audioBlob={recordingData.blob}
            audioUrl={recordingData.url}
            duration={recordingData.duration}
            className="mt-4"
            showWaveform={playerOptions.showWaveform}
            showControls={playerOptions.showControls}
            showVolume={playerOptions.showVolume && !isMobileDevice} // Hide volume on mobile
            showSpeed={playerOptions.showSpeed && !compactMode}
            showDownload={playerOptions.showDownload}
            autoPlay={playerOptions.autoPlay}
            // Mobile optimizations
            mobileOptimized={isMobileDevice}
            compactMode={compactMode}
            // Storage metadata
            storageMetadata={recordingData.uploadResult ? {
              fileName: recordingData.uploadResult.fileName,
              fileSize: recordingData.blob.size,
              uploadedAt: recordingData.uploadResult.uploadedAt,
              isFromStorage: recordingData.isUploaded
            } : undefined}
          />
        </div>
      )}

      {/* Browser Support Warning */}
      {!supportedMimeType && (
        <Alert variant="warning" className={`${compactMode ? 'mt-2' : 'mt-4'}`}>
          <div className="space-y-2">
            <p className="font-medium">{t('audioRecorder.errors.unsupportedBrowser')}</p>
            {isMobileDevice && (
              <p className="text-sm">
                {isIOSDevice 
                  ? t('audioRecorder.mobile.safariRecommended')
                  : t('audioRecorder.mobile.chromeRecommended')
                }
              </p>
            )}
          </div>
        </Alert>
      )}
    </div>
  );
};

export default AudioRecorder; 