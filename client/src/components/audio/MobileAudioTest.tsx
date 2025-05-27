import React, { useState } from 'react';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import AudioRecorder from './AudioRecorder';
import { Alert } from '../ui/alert';

export const MobileAudioTest: React.FC = () => {
  const mobileDetection = useMobileDetection();
  const [lastRecording, setLastRecording] = useState<{ blob: Blob; duration: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    setLastRecording({ blob: audioBlob, duration });
    setError(null);
  };

  const handleRecordingError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Mobile Audio Test
        </h1>
        <p className="text-gray-600">
          Testing mobile-optimized audio recording functionality
        </p>
      </div>

      {/* Device Detection Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Device Detection</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
          <div>Mobile: {mobileDetection.isMobile ? '✅' : '❌'}</div>
          <div>Tablet: {mobileDetection.isTablet ? '✅' : '❌'}</div>
          <div>iOS: {mobileDetection.isIOS ? '✅' : '❌'}</div>
          <div>Android: {mobileDetection.isAndroid ? '✅' : '❌'}</div>
          <div>Touch: {mobileDetection.isTouchDevice ? '✅' : '❌'}</div>
          <div>Orientation: {mobileDetection.isLandscape ? 'Landscape' : 'Portrait'}</div>
          <div>Screen: {mobileDetection.screenWidth}×{mobileDetection.screenHeight}</div>
          <div>Device Type: {mobileDetection.isDesktop ? 'Desktop' : mobileDetection.isTablet ? 'Tablet' : 'Mobile'}</div>
        </div>
      </div>

      {/* Mobile Warnings */}
      {mobileDetection.isMobile && (
        <Alert variant="info" className="mb-4">
          <div className="space-y-2">
            <p className="font-medium">Mobile Device Detected</p>
            <p className="text-sm">
              {mobileDetection.isIOS 
                ? "You're using an iOS device. Make sure to allow microphone access and ensure Safari is up to date for best audio recording experience."
                : "You're using an Android device. Chrome is recommended for the best audio recording experience."
              }
            </p>
          </div>
        </Alert>
      )}

      {/* Standard Mobile-Optimized Recorder */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Standard Mobile Audio Recorder
        </h2>
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingError={handleRecordingError}
          maxDuration={60}
          showWaveform={true}
          showPlayer={true}
          mobileOptimized={mobileDetection.isMobile || mobileDetection.isTablet}
          compactMode={false}
          playerOptions={{
            showWaveform: true,
            showControls: true,
            showVolume: !mobileDetection.isMobile,
            showSpeed: !mobileDetection.isMobile,
            showDownload: true,
            autoPlay: false,
          }}
        />
      </div>

      {/* Compact Mobile Recorder */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Compact Mode Audio Recorder
        </h2>
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingError={handleRecordingError}
          maxDuration={30}
          showWaveform={!mobileDetection.isMobile}
          showPlayer={true}
          mobileOptimized={true}
          compactMode={true}
          playerOptions={{
            showWaveform: false,
            showControls: true,
            showVolume: false,
            showSpeed: false,
            showDownload: false,
            autoPlay: false,
          }}
        />
      </div>

      {/* Recording Results */}
      {lastRecording && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Last Recording</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>Duration: {Math.round(lastRecording.duration)}s</p>
            <p>Size: {(lastRecording.blob.size / 1024).toFixed(1)} KB</p>
            <p>Type: {lastRecording.blob.type}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <div className="space-y-2">
            <p className="font-medium">Recording Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {/* Mobile Tips */}
      {mobileDetection.isMobile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Mobile Tips</h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Ensure your device has a working microphone</li>
            <li>Grant microphone permissions when prompted</li>
            <li>Use headphones for better audio quality</li>
            <li>Record in a quiet environment</li>
            {mobileDetection.isIOS && (
              <li>On iOS, tap the record button to unlock audio context</li>
            )}
            <li>Tap and hold controls for better precision</li>
            <li>Use landscape mode for larger controls if needed</li>
          </ul>
        </div>
      )}

      {/* Browser Compatibility */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Browser Compatibility</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Recommended:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>iOS: Safari 14.1+</li>
            <li>Android: Chrome 91+</li>
            <li>Desktop: Chrome 91+, Firefox 90+, Safari 14.1+</li>
          </ul>
          <p className="mt-2"><strong>Features tested:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>MediaRecorder API: {typeof MediaRecorder !== 'undefined' ? '✅' : '❌'}</li>
            <li>Web Audio API: {typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined' ? '✅' : '❌'}</li>
            <li>getUserMedia: {navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 