import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

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

export interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onRecordingError?: (error: string) => void;
  maxDuration?: number; // in seconds
  className?: string;
  disabled?: boolean;
  showWaveform?: boolean;
}

export interface RecordingData {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingError,
  maxDuration = 300, // 5 minutes default
  className = '',
  disabled = false,
  showWaveform = true
}) => {
  const { t } = useTranslation();
  
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [supportedMimeType, setSupportedMimeType] = useState<string>('');

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

  // Request microphone permission and start recording
  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      setErrorMessage('');

      if (!supportedMimeType) {
        throw new Error(t('audioRecorder.errors.unsupportedBrowser'));
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      audioStreamRef.current = stream;
      setupAudioContext(stream);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: supportedMimeType,
        audioBitsPerSecond: 128000
      });

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
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, duration);
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
      mediaRecorder.start(100); // Collect data every 100ms
      
      setRecordingState('recording');
      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      let errorMsg = t('audioRecorder.errors.microphoneAccess');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMsg = t('audioRecorder.errors.permissionDenied');
        } else if (error.name === 'NotFoundError') {
          errorMsg = t('audioRecorder.errors.noMicrophone');
        } else if (error.name === 'NotSupportedError') {
          errorMsg = t('audioRecorder.errors.unsupportedBrowser');
        }
      }

      setErrorMessage(errorMsg);
      setRecordingState('error');
      
      if (onRecordingError) {
        onRecordingError(errorMsg);
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
    <div className={`audio-recorder bg-white rounded-xl p-6 border border-gray-200 shadow-lumea-sm ${className}`}>
      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      {/* Recording Status */}
      <div className="text-center mb-4">
        {recordingState === 'requesting' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lumea-primary"></div>
            <span className="text-sm text-gray-600">{t('audioRecorder.requestingPermission')}</span>
          </div>
        )}
        
        {recordingState === 'recording' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-600">{t('audioRecorder.recording')}</span>
          </div>
        )}
        
        {recordingState === 'paused' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-600">{t('audioRecorder.paused')}</span>
          </div>
        )}
        
        {recordingState === 'completed' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-600">{t('audioRecorder.completed')}</span>
          </div>
        )}
      </div>

      {/* Waveform Visualization */}
      <WaveformDisplay />

      {/* Duration Display */}
      <div className="text-center my-4">
        <span className="text-2xl font-mono font-bold text-gray-800">
          {formatDuration(duration)}
        </span>
        {maxDuration && (
          <span className="text-sm text-gray-500 ml-2">
            / {formatDuration(maxDuration)}
          </span>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex justify-center space-x-3">
        {recordingState === 'idle' && (
          <Button
            onClick={startRecording}
            disabled={disabled || !supportedMimeType}
            variant="lumea"
            size="lg"
            className="px-8"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.pause')}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.resume')}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              {t('audioRecorder.stop')}
            </Button>
          </>
        )}

        {recordingState === 'completed' && (
          <Button
            onClick={resetRecording}
            variant="outline"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {t('audioRecorder.recordAgain')}
          </Button>
        )}
      </div>

      {/* Recording Info */}
      {recordingData && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <p>{t('audioRecorder.recordingComplete')}</p>
            <p>{t('audioRecorder.duration')}: {formatDuration(recordingData.duration)}</p>
            <p>{t('audioRecorder.format')}: {recordingData.mimeType}</p>
            <p>{t('audioRecorder.size')}: {(recordingData.blob.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      )}

      {/* Browser Support Warning */}
      {!supportedMimeType && (
        <Alert variant="warning" className="mt-4">
          {t('audioRecorder.errors.unsupportedBrowser')}
        </Alert>
      )}
    </div>
  );
};

export default AudioRecorder; 