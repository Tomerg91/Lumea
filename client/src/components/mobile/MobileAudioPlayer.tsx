import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  MoreVertical,
  Download,
  Share,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export interface MobileAudioPlayerProps {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  className?: string;
  showWaveform?: boolean;
  showControls?: boolean;
  showSpeed?: boolean;
  showDownload?: boolean;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onDelete?: () => void;
  title?: string;
}

export type MobilePlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50, 25, 50]
    };
    navigator.vibrate(patterns[type]);
  }
};

// Touch-optimized progress bar component
const TouchProgressBar: React.FC<{
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  waveformData?: number[];
}> = ({ currentTime, duration, onSeek, waveformData }) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  const handleInteractionStart = useCallback((clientX: number) => {
    if (!progressRef.current) return;
    
    setIsDragging(true);
    triggerHaptic('light');
    
    const rect = progressRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDragPosition(position);
    
    const seekTime = position * duration;
    onSeek(seekTime);
  }, [duration, onSeek]);

  const handleInteractionMove = useCallback((clientX: number) => {
    if (!isDragging || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDragPosition(position);
    
    const seekTime = position * duration;
    onSeek(seekTime);
  }, [isDragging, duration, onSeek]);

  const handleInteractionEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      triggerHaptic('medium');
    }
  }, [isDragging]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleInteractionStart(e.touches[0].clientX);
  }, [handleInteractionStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleInteractionMove(e.touches[0].clientX);
  }, [handleInteractionMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleInteractionEnd();
  }, [handleInteractionEnd]);

  // Mouse events for desktop fallback
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleInteractionStart(e.clientX);
  }, [handleInteractionStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleInteractionMove(e.clientX);
  }, [handleInteractionMove]);

  const handleMouseUp = useCallback(() => {
    handleInteractionEnd();
  }, [handleInteractionEnd]);

  const progress = duration > 0 ? (isDragging ? dragPosition : currentTime / duration) : 0;

  return (
    <div className="relative">
      {/* Waveform background */}
      {waveformData && waveformData.length > 0 && (
        <div className="absolute inset-0 flex items-center">
          <div className="flex items-center justify-between w-full h-8 px-2">
            {waveformData.map((amplitude, index) => (
              <div
                key={index}
                className={cn(
                  'w-1 rounded-full transition-colors',
                  index / waveformData.length <= progress
                    ? 'bg-lumea-primary'
                    : 'bg-gray-300'
                )}
                style={{
                  height: `${Math.max(2, amplitude * 24)}px`
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="relative h-12 bg-gray-100 rounded-full cursor-pointer touch-manipulation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Track background */}
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full bg-gradient-purple rounded-full transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
        
        {/* Scrubber handle */}
        <div
          className={cn(
            'absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2',
            'w-6 h-6 bg-white rounded-full shadow-lg border-2 border-lumea-primary',
            'transition-transform duration-200',
            isDragging ? 'scale-125' : 'scale-100'
          )}
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};

// Mobile action sheet component
const MobileActionSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  showDownload?: boolean;
}> = ({ isOpen, onClose, onDownload, onShare, onDelete, showDownload = true }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Action sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 space-y-3">
          {showDownload && onDownload && (
            <button
              onClick={() => {
                onDownload();
                onClose();
              }}
              className="flex items-center w-full p-4 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <Download className="w-6 h-6 text-gray-600 mr-4" />
              <span className="text-lg font-medium">{t('audioPlayer.download')}</span>
            </button>
          )}
          
          {onShare && (
            <button
              onClick={() => {
                onShare();
                onClose();
              }}
              className="flex items-center w-full p-4 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <Share className="w-6 h-6 text-gray-600 mr-4" />
              <span className="text-lg font-medium">{t('audioPlayer.share')}</span>
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="flex items-center w-full p-4 rounded-2xl hover:bg-red-50 transition-colors text-red-600"
            >
              <Trash2 className="w-6 h-6 mr-4" />
              <span className="text-lg font-medium">{t('audioPlayer.delete')}</span>
            </button>
          )}
        </div>
        
        {/* Cancel button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full p-4 bg-gray-100 rounded-2xl font-medium text-lg"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

const MobileAudioPlayer: React.FC<MobileAudioPlayerProps> = ({
  audioBlob,
  audioUrl,
  duration,
  className = '',
  showWaveform = true,
  showControls = true,
  showSpeed = false,
  showDownload = true,
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  onError,
  onDelete,
  title
}) => {
  const { t } = useTranslation();
  const { isMobile } = useMobileDetection();
  
  // State management
  const [playbackState, setPlaybackState] = useState<MobilePlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState<boolean>(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState<boolean>(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const audio = audioRef.current;
      
      // Set audio properties
      audio.volume = volume;
      audio.muted = isMuted;
      audio.playbackRate = playbackSpeed;
      
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
        triggerHaptic('light');
      };

      const handleError = () => {
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
    if (!audioBlob || !showWaveform) return;

    setIsLoadingWaveform(true);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = 40; // Fewer bars for mobile
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
  }, [audioBlob, showWaveform]);

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
      triggerHaptic('light');
    } else {
      setPlaybackState('loading');
      audioRef.current.play()
        .then(() => {
          setPlaybackState('playing');
          triggerHaptic('medium');
        })
        .catch(() => setPlaybackState('error'));
    }
  };

  // Seek to specific time
  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Skip backward
  const handleSkipBackward = () => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, audioRef.current.currentTime - 15);
    handleSeek(newTime);
    triggerHaptic('light');
  };

  // Skip forward
  const handleSkipForward = () => {
    if (!audioRef.current) return;
    const newTime = Math.min(duration, audioRef.current.currentTime + 15);
    handleSeek(newTime);
    triggerHaptic('light');
  };

  // Toggle mute
  const handleMuteToggle = () => {
    if (!audioRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
    triggerHaptic('light');
  };

  // Change playback speed
  const handleSpeedChange = () => {
    if (!audioRef.current) return;
    
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    
    setPlaybackSpeed(newSpeed);
    audioRef.current.playbackRate = newSpeed;
    triggerHaptic('light');
  };

  // Download audio
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = title || 'audio-recording.webm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerHaptic('medium');
  };

  // Share audio (if supported)
  const handleShare = async () => {
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([audioBlob], title || 'audio-recording.webm', {
          type: audioBlob.type
        });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title || 'Audio Recording',
            files: [file]
          });
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
    triggerHaptic('medium');
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render on desktop unless mobile is forced
  if (!isMobile) {
    return (
      <div className={cn('bg-white rounded-2xl p-4 shadow-sm', className)}>
        <audio controls src={audioUrl} className="w-full" />
      </div>
    );
  }

  return (
    <div className={cn(
      'mobile-audio-player bg-white rounded-2xl shadow-sm border border-gray-100',
      className
    )}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex-1">
          {title ? (
            <h3 className="font-medium text-gray-900 truncate">{title}</h3>
          ) : (
            <h3 className="font-medium text-gray-900">{t('audioPlayer.recording')}</h3>
          )}
          <div className="text-sm text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <button
          onClick={() => setIsActionSheetOpen(true)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-6">
        <TouchProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          waveformData={showWaveform ? waveformData : undefined}
        />
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-center space-x-6 px-4 pb-4">
          {/* Skip backward */}
          <button
            onClick={handleSkipBackward}
            className="p-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            <SkipBack className="w-6 h-6 text-gray-600" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlay}
            disabled={playbackState === 'loading' || playbackState === 'error'}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center',
              'bg-gradient-purple text-white shadow-lumea-strong',
              'hover:shadow-lumea-glow transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95'
            )}
          >
            {playbackState === 'loading' ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : playbackState === 'playing' ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={handleSkipForward}
            className="p-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            <SkipForward className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      )}

      {/* Secondary controls */}
      <div className="flex items-center justify-between px-4 pb-4">
        {/* Volume */}
        <button
          onClick={handleMuteToggle}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-600" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* Speed */}
        {showSpeed && (
          <button
            onClick={handleSpeedChange}
            className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <span className="text-sm font-medium">{playbackSpeed}×</span>
          </button>
        )}
      </div>

      {/* Error state */}
      {playbackState === 'error' && (
        <div className="px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-800 text-sm text-center">
              {t('audioPlayer.errors.playbackFailed')}
            </p>
          </div>
        </div>
      )}

      {/* Action sheet */}
      <MobileActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onDownload={showDownload ? handleDownload : undefined}
        onShare={navigator.share ? handleShare : undefined}
        onDelete={onDelete}
        showDownload={showDownload}
      />
    </div>
  );
};

export default MobileAudioPlayer; 