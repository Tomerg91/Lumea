import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  SkipBack,
  SkipForward,
  Download
} from 'lucide-react';

export interface AudioPlayerProps {
  audioBlob?: Blob;
  audioUrl: string;
  duration: number;
  className?: string;
  showWaveform?: boolean;
  showControls?: boolean;
  showVolume?: boolean;
  showSpeed?: boolean;
  showDownload?: boolean;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  // Mobile optimization props
  mobileOptimized?: boolean;
  compactMode?: boolean;
  // Supabase Storage props
  storageMetadata?: {
    fileName?: string;
    fileSize?: number;
    uploadedAt?: string;
    isFromStorage?: boolean;
  };
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  audioUrl,
  duration,
  className = '',
  showWaveform = true,
  showControls = true,
  showVolume = true,
  showSpeed = true,
  showDownload = true,
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  onError,
  mobileOptimized = false,
  compactMode = false,
  storageMetadata
}) => {
  const { t } = useTranslation();
  
  // State management
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState<boolean>(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const audio = audioRef.current;
      
      // Set up event listeners
      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        setCurrentTime(time);
        if (onTimeUpdate) {
          onTimeUpdate(time);
        }
      };

      const handleLoadedData = () => {
        setPlaybackState('idle');
        if (autoPlay) {
          handlePlay();
        }
      };

      const handleEnded = () => {
        setPlaybackState('ended');
        setCurrentTime(duration);
        if (onEnded) {
          onEnded();
        }
      };

      const handleError = (e: Event) => {
        setPlaybackState('error');
        const errorMsg = t('audioPlayer.errors.playbackFailed');
        if (onError) {
          onError(errorMsg);
        }
      };

      const handleCanPlay = () => {
        if (playbackState === 'loading') {
          setPlaybackState('idle');
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [audioUrl, duration, autoPlay, onTimeUpdate, onEnded, onError, playbackState, t]);

  // Generate waveform data
  const generateWaveform = useCallback(async () => {
    if (!showWaveform) return;

    setIsLoadingWaveform(true);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      let arrayBuffer: ArrayBuffer;

      // Get audio data from blob or fetch from URL
      if (audioBlob) {
        arrayBuffer = await audioBlob.arrayBuffer();
      } else {
        // Fetch from Supabase Storage URL or other URL
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch audio data');
        }
        arrayBuffer = await response.arrayBuffer();
      }

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of waveform bars
      const blockSize = Math.floor(channelData.length / samples);
      const filteredData = [];

      for (let i = 0; i < samples; i++) {
        const start = blockSize * i;
        let sum = 0;
        
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[start + j]);
        }
        
        filteredData.push(sum / blockSize);
      }

      // Normalize the data
      const maxVal = Math.max(...filteredData);
      const normalizedData = filteredData.map(val => val / maxVal);
      
      setWaveformData(normalizedData);
      await audioContext.close();
    } catch (error) {
      console.error('Error generating waveform:', error);
    } finally {
      setIsLoadingWaveform(false);
    }
  }, [audioBlob, audioUrl, showWaveform]);

  // Generate waveform when audio loads
  useEffect(() => {
    generateWaveform();
  }, [generateWaveform]);

  // Play/Pause toggle
  const handlePlay = () => {
    if (!audioRef.current) return;

    if (playbackState === 'playing') {
      audioRef.current.pause();
      setPlaybackState('paused');
    } else {
      setPlaybackState('loading');
      audioRef.current.play()
        .then(() => setPlaybackState('playing'))
        .catch(() => setPlaybackState('error'));
    }
  };

  // Stop playback
  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setPlaybackState('idle');
  };

  // Seek to specific time
  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    
    const seekTime = Math.max(0, Math.min(time, duration));
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Skip backward
  const handleSkipBackward = () => {
    handleSeek(currentTime - 10);
  };

  // Skip forward
  const handleSkipForward = () => {
    handleSeek(currentTime + 10);
  };

  // Volume control
  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0] / 100;
    setVolume(vol);
    setIsMuted(vol === 0);
    
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  // Mute toggle
  const handleMuteToggle = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Playback speed control
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Progress bar click handling
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickProgress = clickX / progressWidth;
    const seekTime = clickProgress * duration;
    
    handleSeek(seekTime);
  };

  // Waveform click handling
  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const canvasWidth = rect.width;
    const clickProgress = clickX / canvasWidth;
    const seekTime = clickProgress * duration;
    
    handleSeek(seekTime);
  };

  // Download audio file
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    
    // Determine filename
    let filename = 'audio-recording';
    if (storageMetadata?.fileName) {
      filename = storageMetadata.fileName;
    } else if (audioBlob) {
      filename = `audio-${Date.now()}.${audioBlob.type.split('/')[1] || 'webm'}`;
    } else {
      // Extract filename from URL if possible
      const urlParts = audioUrl.split('/');
      const urlFilename = urlParts[urlParts.length - 1];
      if (urlFilename && urlFilename.includes('.')) {
        filename = urlFilename.split('?')[0]; // Remove query parameters
      } else {
        filename = `audio-${Date.now()}.mp3`;
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Waveform visualization component
  const WaveformVisualization = () => {
    if (!showWaveform) return null;

    const canvasWidth = 400;
    const canvasHeight = 80;

    useEffect(() => {
      if (!canvasRef.current || !waveformData.length) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw waveform
      const barWidth = canvasWidth / waveformData.length;
      const maxBarHeight = canvasHeight - 10;

      waveformData.forEach((amplitude, index) => {
        const barHeight = amplitude * maxBarHeight;
        const x = index * barWidth;
        const y = (canvasHeight - barHeight) / 2;

        // Color based on playback progress
        const progress = currentTime / duration;
        const barProgress = index / waveformData.length;
        const isPlayed = barProgress <= progress;

        ctx.fillStyle = isPlayed ? '#3B82F6' : '#E5E7EB';
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      });

      // Draw progress line
      const progressX = (currentTime / duration) * canvasWidth;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, canvasHeight);
      ctx.stroke();
    }, [waveformData, currentTime, duration]);

    if (isLoadingWaveform) {
      return (
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-lumea-primary"></div>
          <span className="ml-2 text-sm text-gray-600">{t('audioPlayer.loadingWaveform')}</span>
        </div>
      );
    }

    return (
      <div className="my-4">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-20 cursor-pointer border border-gray-200 rounded"
          onClick={handleWaveformClick}
          style={{ maxWidth: '100%' }}
        />
      </div>
    );
  };

  return (
    <div className={`audio-player bg-white rounded-xl p-6 border border-gray-200 shadow-lumea-sm ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Waveform Visualization */}
      <WaveformVisualization />

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          ref={progressRef}
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-lumea-primary rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      {showControls && (
        <div className="flex justify-center items-center space-x-3 mb-4">
          <Button
            onClick={handleSkipBackward}
            variant="outline"
            size="sm"
            disabled={playbackState === 'error'}
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            onClick={handlePlay}
            variant="lumea"
            size="lg"
            disabled={playbackState === 'error'}
            className="px-8"
          >
            {playbackState === 'loading' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : playbackState === 'playing' ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          <Button
            onClick={handleStop}
            variant="outline"
            size="sm"
            disabled={playbackState === 'error'}
          >
            <Square className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleSkipForward}
            variant="outline"
            size="sm"
            disabled={playbackState === 'error'}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Additional Controls */}
      <div className="flex justify-between items-center">
        {/* Volume Control */}
        {showVolume && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleMuteToggle}
              variant="ghost"
              size="sm"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        )}

        {/* Playback Speed */}
        {showSpeed && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{t('audioPlayer.speed')}:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {PLAYBACK_SPEEDS.map(speed => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Download Button */}
        {showDownload && (
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('audioPlayer.download')}
          </Button>
        )}
      </div>

      {/* Playback State Indicator */}
      <div className="mt-4 text-center">
        {playbackState === 'error' && (
          <div className="text-red-600 text-sm">
            {t('audioPlayer.errors.playbackFailed')}
          </div>
        )}
        {playbackState === 'loading' && (
          <div className="text-gray-600 text-sm">
            {t('audioPlayer.loading')}
          </div>
        )}
        {playbackState === 'ended' && (
          <div className="text-green-600 text-sm">
            {t('audioPlayer.playbackComplete')}
          </div>
        )}
      </div>

      {/* Storage Metadata Display */}
      {storageMetadata?.isFromStorage && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{t('audioPlayer.storedInCloud', 'Stored in cloud')}</span>
            </div>
            
            {storageMetadata.uploadedAt && (
              <span>
                {t('audioPlayer.uploaded', 'Uploaded')}: {new Date(storageMetadata.uploadedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          
          {(storageMetadata.fileName || storageMetadata.fileSize) && (
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              {storageMetadata.fileName && (
                <div>{t('audioPlayer.fileName', 'File')}: {storageMetadata.fileName}</div>
              )}
              {storageMetadata.fileSize && (
                <div>{t('audioPlayer.fileSize', 'Size')}: {(storageMetadata.fileSize / 1024).toFixed(1)} KB</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer; 