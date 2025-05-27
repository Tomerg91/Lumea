import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Send,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';

// Audio recording states
export type MobileRecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'completed' | 'error';

// Audio format options optimized for mobile
const MOBILE_AUDIO_FORMATS = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm', quality: 'high' },
  { mimeType: 'audio/mp4', extension: 'm4a', quality: 'high' },
  { mimeType: 'audio/webm', extension: 'webm', quality: 'medium' },
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg', quality: 'medium' },
] as const;

interface MobileAudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onRecordingError?: (error: string) => void;
  maxDuration?: number; // in seconds
  className?: string;
  disabled?: boolean;
  autoSubmit?: boolean; // Auto-submit after recording completion
  showWaveform?: boolean;
  mode?: 'overlay' | 'inline'; // Display mode
  onClose?: () => void; // For overlay mode
}

interface RecordingData {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100, 50, 100]
    };
    navigator.vibrate(patterns[type]);
  }
};

// Audio level visualization component
const MobileWaveform: React.FC<{ 
  audioLevel: number; 
  isRecording: boolean; 
  barCount?: number;
}> = ({ audioLevel, isRecording, barCount = 12 }) => {
  const bars = Array.from({ length: barCount }, (_, index) => {
    const baseHeight = 4;
    const height = isRecording 
      ? Math.max(baseHeight, audioLevel * 48 + Math.random() * 8) 
      : baseHeight;
    
    return (
      <div
        key={index}
        className={cn(
          'rounded-full transition-all duration-100 ease-out',
          isRecording 
            ? 'bg-gradient-to-t from-red-400 to-red-600' 
            : 'bg-gray-300'
        )}
        style={{
          height: `${height}px`,
          width: '4px',
          minHeight: `${baseHeight}px`
        }}
      />
    );
  });

  return (
    <div className="flex items-center justify-center space-x-1 h-16">
      {bars}
    </div>
  );
};

// Hold-to-record button component
const HoldToRecordButton: React.FC<{
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
  recordingProgress: number; // 0-1
}> = ({ isRecording, onStart, onStop, disabled, recordingProgress }) => {
  const { t } = useTranslation();
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (disabled || isRecording) return;
    
    setIsPressed(true);
    triggerHaptic('light');
    
    // Start recording after short delay to prevent accidental triggers
    timeoutRef.current = setTimeout(() => {
      onStart();
      triggerHaptic('medium');
    }, 150);
  }, [disabled, isRecording, onStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (isRecording) {
      onStop();
      triggerHaptic('heavy');
    }
  }, [isRecording, onStop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Check if finger moved outside button area
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const isOutside = (
      touch.clientX < rect.left || 
      touch.clientX > rect.right || 
      touch.clientY < rect.top || 
      touch.clientY > rect.bottom
    );
    
    if (isOutside && isRecording) {
      onStop();
      triggerHaptic('heavy');
    }
  }, [isRecording, onStop]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      {/* Progress ring for max duration */}
      {isRecording && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32">
            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray={`${recordingProgress * 100}, 100`}
                className="transition-all duration-200"
              />
            </svg>
          </div>
        </div>
      )}
      
      {/* Main button */}
      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        disabled={disabled}
        className={cn(
          'relative flex items-center justify-center',
          'w-28 h-28 rounded-full',
          'transition-all duration-200 ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'touch-manipulation select-none',
          isRecording
            ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110'
            : isPressed
            ? 'bg-gradient-purple scale-105 shadow-lg shadow-purple-500/50'
            : 'bg-gradient-purple shadow-lumea-strong hover:shadow-lumea-glow'
        )}
        aria-label={isRecording ? t('audioRecorder.recording') : t('audioRecorder.holdToRecord')}
      >
        {isRecording ? (
          <Square className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>
      
      {/* Instruction text */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className="text-sm text-gray-600 font-medium">
          {isRecording 
            ? t('audioRecorder.releaseToStop') 
            : t('audioRecorder.holdToRecord')
          }
        </span>
      </div>
    </div>
  );
};

const MobileAudioRecorder: React.FC<MobileAudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingError,
  maxDuration = 300, // 5 minutes default
  className = '',
  disabled = false,
  autoSubmit = false,
  showWaveform = true,
  mode = 'inline',
  onClose
}) => {
  const { t } = useTranslation();
  const { isMobile, isIOS, isAndroid } = useMobileDetection();
  
  // State management
  const [recordingState, setRecordingState] = useState<MobileRecordingState>('idle');
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [supportedMimeType, setSupportedMimeType] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

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
      for (const format of MOBILE_AUDIO_FORMATS) {
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

  // Check microphone permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionStatus(result.state === 'granted' ? 'granted' : 'denied');
          
          result.addEventListener('change', () => {
            setPermissionStatus(result.state === 'granted' ? 'granted' : 'denied');
          });
        }
      } catch (error) {
        // Permission API not supported, will check during recording
        setPermissionStatus('unknown');
      }
    };

    checkPermission();
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

  // Start recording
  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      setErrorMessage('');
      triggerHaptic('light');

      if (!supportedMimeType) {
        throw new Error(t('audioRecorder.errors.unsupportedBrowser'));
      }

      // Mobile-optimized audio constraints
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1, // Mono for mobile to save bandwidth
      };

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      setPermissionStatus('granted');
      audioStreamRef.current = stream;
      setupAudioContext(stream);

      // Create MediaRecorder with mobile-optimized settings
      const mediaRecorderOptions = {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 64000 // Lower bitrate for mobile
      };

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const recordingData: RecordingData = {
          blob: audioBlob,
          url: audioUrl,
          duration,
          mimeType: supportedMimeType
        };

        setRecordingData(recordingData);
        setRecordingState('completed');
        
        if (autoSubmit && onRecordingComplete) {
          onRecordingComplete(audioBlob, duration);
        }
        
        triggerHaptic('heavy');
      };

      mediaRecorder.onerror = () => {
        const error = t('audioRecorder.errors.recordingFailed');
        setErrorMessage(error);
        setRecordingState('error');
        if (onRecordingError) {
          onRecordingError(error);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording
      mediaRecorder.start(1000); // 1 second chunks for mobile
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
        setPermissionStatus('denied');
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

  // Submit recording
  const submitRecording = () => {
    if (recordingData && onRecordingComplete) {
      onRecordingComplete(recordingData.blob, recordingData.duration);
      triggerHaptic('medium');
    }
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

  // Don't render on desktop unless forced
  if (!isMobile && mode === 'inline') {
    return null;
  }

  const content = (
    <div className={cn(
      'mobile-audio-recorder bg-white rounded-3xl shadow-2xl',
      mode === 'overlay' ? 'fixed inset-4 z-50 flex flex-col' : 'p-6',
      className
    )}>
      {/* Header for overlay mode */}
      {mode === 'overlay' && (
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold">{t('audioRecorder.recordAudio')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className={cn(
        'flex-1 flex flex-col',
        mode === 'overlay' ? 'p-6 pt-0' : ''
      )}>
        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-800 text-center font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Permission Denied Warning */}
        {permissionStatus === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">
              {t('audioRecorder.permissionRequired')}
            </h3>
            <p className="text-amber-800 text-sm">
              {isIOS 
                ? t('audioRecorder.iosPermissionInstructions')
                : t('audioRecorder.androidPermissionInstructions')
              }
            </p>
          </div>
        )}

        {/* Recording Status */}
        <div className="text-center mb-6">
          {recordingState === 'requesting' && (
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-lumea-primary" />
              <span className="text-lg text-gray-600">
                {t('audioRecorder.requestingPermission')}
              </span>
            </div>
          )}
          
          {recordingState === 'recording' && (
            <div className="flex items-center justify-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-lg font-medium text-red-600">
                {t('audioRecorder.recording')}
              </span>
            </div>
          )}
          
          {recordingState === 'completed' && (
            <div className="flex items-center justify-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full" />
              <span className="text-lg font-medium text-green-600">
                {t('audioRecorder.completed')}
              </span>
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        {showWaveform && (recordingState === 'recording' || recordingState === 'completed') && (
          <div className="mb-6">
            <MobileWaveform audioLevel={audioLevel} isRecording={recordingState === 'recording'} />
          </div>
        )}

        {/* Duration Display */}
        <div className="text-center mb-8">
          <span className="font-mono font-bold text-gray-800 text-4xl">
            {formatDuration(duration)}
          </span>
          {maxDuration && (
            <span className="text-gray-500 ml-3 text-lg">
              / {formatDuration(maxDuration)}
            </span>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex-1 flex items-center justify-center mb-8">
          {(recordingState === 'idle' || recordingState === 'recording') && (
            <HoldToRecordButton
              isRecording={recordingState === 'recording'}
              onStart={startRecording}
              onStop={stopRecording}
              disabled={disabled || !supportedMimeType}
              recordingProgress={maxDuration ? duration / maxDuration : 0}
            />
          )}
        </div>

        {/* Playback and Action Controls */}
        {recordingState === 'completed' && recordingData && (
          <div className="space-y-4">
            {/* Basic playback */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <audio 
                controls 
                src={recordingData.url}
                className="w-full"
                style={{ height: '48px' }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              <button
                onClick={resetRecording}
                className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="font-medium">{t('audioRecorder.recordAgain')}</span>
              </button>
              
              {!autoSubmit && (
                <button
                  onClick={submitRecording}
                  className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-gradient-purple text-white rounded-2xl shadow-lumea-strong hover:shadow-lumea-glow transition-all"
                >
                  <Send className="w-5 h-5" />
                  <span className="font-medium">{t('common.submit')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Browser Support Warning */}
        {!supportedMimeType && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-6">
            <p className="font-medium text-amber-900 mb-2">
              {t('audioRecorder.errors.unsupportedBrowser')}
            </p>
            <p className="text-sm text-amber-800">
              {isIOS 
                ? t('audioRecorder.safariRecommended')
                : t('audioRecorder.chromeRecommended')
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Overlay mode with backdrop
  if (mode === 'overlay') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
};

export default MobileAudioRecorder; 