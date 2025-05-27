import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  volume?: number;
  playbackSpeed?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onStateChange?: (state: PlaybackState) => void;
}

export interface AudioPlayerControls {
  // Playback state
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  hasEnded: boolean;
  hasError: boolean;

  // Audio properties
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  buffered: number;

  // Control functions
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  skipBackward: (seconds?: number) => void;
  skipForward: (seconds?: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  load: (audioUrl: string) => void;
  reset: () => void;

  // Utility functions
  formatTime: (seconds: number) => string;
  getProgressPercentage: () => number;
}

const useAudioPlayer = ({
  autoPlay = false,
  volume = 1,
  playbackSpeed = 1,
  onTimeUpdate,
  onEnded,
  onError,
  onStateChange
}: UseAudioPlayerOptions = {}): AudioPlayerControls => {
  const { t } = useTranslation();

  // State
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(volume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentPlaybackSpeed, setCurrentPlaybackSpeed] = useState<number>(playbackSpeed);
  const [buffered, setBuffered] = useState<number>(0);
  const [previousVolume, setPreviousVolume] = useState<number>(volume);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentUrlRef = useRef<string>('');

  // State change handler
  const updatePlaybackState = useCallback((newState: PlaybackState) => {
    setPlaybackState(newState);
    if (onStateChange) {
      onStateChange(newState);
    }
  }, [onStateChange]);

  // Error handler
  const handleErrorCallback = useCallback((errorMessage: string) => {
    updatePlaybackState('error');
    if (onError) {
      onError(errorMessage);
    }
  }, [onError, updatePlaybackState]);

  // Setup audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      updatePlaybackState('idle');
      
      if (autoPlay) {
        play();
      }
    };

    const handleCanPlay = () => {
      if (playbackState === 'loading') {
        updatePlaybackState('idle');
      }
    };

    const handleEnded = () => {
      updatePlaybackState('ended');
      setCurrentTime(duration);
      if (onEnded) {
        onEnded();
      }
    };

    const handleError = () => {
      const errorMsg = t('audioPlayer.errors.playbackFailed', 'Playback failed');
      handleErrorCallback(errorMsg);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(0);
        const bufferedPercentage = (bufferedEnd / audio.duration) * 100;
        setBuffered(bufferedPercentage);
      }
    };

    const handleVolumeChange = () => {
      setAudioVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    const handleRateChange = () => {
      setCurrentPlaybackSpeed(audio.playbackRate);
    };

    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('ratechange', handleRateChange);

    // Set initial values
    audio.volume = audioVolume;
    audio.playbackRate = currentPlaybackSpeed;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('ratechange', handleRateChange);
    };
  }, [autoPlay, audioVolume, currentPlaybackSpeed, duration, onEnded, onTimeUpdate, playbackState, t, updatePlaybackState, handleErrorCallback]);

  // Play function
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current) return;

    try {
      updatePlaybackState('loading');
      await audioRef.current.play();
      updatePlaybackState('playing');
    } catch (error) {
      console.error('Play error:', error);
      handleErrorCallback(t('audioPlayer.errors.playbackFailed', 'Playback failed'));
    }
  }, [handleErrorCallback, t, updatePlaybackState]);

  // Pause function
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    updatePlaybackState('paused');
  }, [updatePlaybackState]);

  // Stop function
  const stop = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    updatePlaybackState('idle');
  }, [updatePlaybackState]);

  // Seek function
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    
    const seekTime = Math.max(0, Math.min(time, duration));
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [duration]);

  // Skip backward
  const skipBackward = useCallback((seconds: number = 10) => {
    seek(currentTime - seconds);
  }, [currentTime, seek]);

  // Skip forward
  const skipForward = useCallback((seconds: number = 10) => {
    seek(currentTime + seconds);
  }, [currentTime, seek]);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    if (!audioRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    audioRef.current.volume = clampedVolume;
    setAudioVolume(clampedVolume);
    
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.muted = false;
      audioRef.current.volume = previousVolume;
      setIsMuted(false);
      setAudioVolume(previousVolume);
    } else {
      setPreviousVolume(audioVolume);
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  }, [audioVolume, isMuted, previousVolume]);

  // Set playback speed
  const setPlaybackSpeed = useCallback((speed: number) => {
    if (!audioRef.current) return;
    
    const clampedSpeed = Math.max(0.25, Math.min(4, speed));
    audioRef.current.playbackRate = clampedSpeed;
    setCurrentPlaybackSpeed(clampedSpeed);
  }, []);

  // Load audio URL
  const load = useCallback((audioUrl: string) => {
    if (!audioRef.current) return;
    
    // Reset state
    stop();
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    updatePlaybackState('loading');
    
    // Set new source
    audioRef.current.src = audioUrl;
    currentUrlRef.current = audioUrl;
    audioRef.current.load();
  }, [stop, updatePlaybackState]);

  // Reset function
  const reset = useCallback(() => {
    if (!audioRef.current) return;
    
    stop();
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    audioRef.current.src = '';
    currentUrlRef.current = '';
  }, [stop]);

  // Format time utility
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get progress percentage
  const getProgressPercentage = useCallback((): number => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  }, [currentTime, duration]);

  // Computed state properties
  const isLoading = playbackState === 'loading';
  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';
  const hasEnded = playbackState === 'ended';
  const hasError = playbackState === 'error';

  // Create audio element if it doesn't exist
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }
  }, []);

  return {
    // State
    playbackState,
    currentTime,
    duration,
    isLoading,
    isPlaying,
    isPaused,
    hasEnded,
    hasError,
    
    // Audio properties
    volume: audioVolume,
    isMuted,
    playbackSpeed: currentPlaybackSpeed,
    buffered,
    
    // Controls
    play,
    pause,
    stop,
    seek,
    skipBackward,
    skipForward,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    load,
    reset,
    
    // Utilities
    formatTime,
    getProgressPercentage
  };
};

export default useAudioPlayer; 